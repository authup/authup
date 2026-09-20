/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { ValidatorGroup } from '@authup/kit';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import { PathProvisioningValidator } from '../../../../../src/core/provisioning/entities/path/validator.ts';
import { ProvisioningEntityStrategyType } from '../../../../../src/core/provisioning/strategy/index.ts';
import { PathProvisioningSynchronizer } from '../../../../../src/core/provisioning/synchronizer/path/module.ts';
import { FakePathRepository } from '../../entities/path/fake-repository.ts';

describe('core/provisioning/synchronizer/path', () => {
    const realmId = randomUUID();

    let repository: FakePathRepository;
    let synchronizer: PathProvisioningSynchronizer;

    beforeEach(() => {
        repository = new FakePathRepository();
        synchronizer = new PathProvisioningSynchronizer({ repository });
    });

    it('should create the missing chain and apply the declared attributes', async () => {
        await synchronizer.synchronize({
            attributes: {
                path: 'sales/berlin',
                displayName: 'Berlin',
                realmId,
            },
        });

        const parent = await repository.findOneBy({ realmId, path: 'sales' });
        expect(parent).not.toBeNull();
        expect(parent!.name).toEqual('sales');
        expect(parent!.parentId).toBeNull();

        const leaf = await repository.findOneBy({ realmId, path: 'sales/berlin' });
        expect(leaf).not.toBeNull();
        expect(leaf!.name).toEqual('berlin');
        expect(leaf!.parentId).toEqual(parent!.id);
        expect(leaf!.displayName).toEqual('Berlin');
    });

    it('should leave an existing folder alone under the createOnly default', async () => {
        repository.seed({
            name: 'sales',
            path: 'sales',
            parentId: null,
            realmId,
            displayName: 'Kept',
            description: null,
        });

        await synchronizer.synchronize({
            attributes: {
                path: 'sales',
                displayName: 'Overwritten',
                realmId,
            },
        });

        const entity = await repository.findOneBy({ realmId, path: 'sales' });
        expect(entity!.displayName).toEqual('Kept');
    });

    it('should update the display name under the merge strategy', async () => {
        repository.seed({
            name: 'sales',
            path: 'sales',
            parentId: null,
            realmId,
            displayName: 'Kept',
            description: null,
        });

        await synchronizer.synchronize({
            strategy: { type: ProvisioningEntityStrategyType.MERGE },
            attributes: {
                path: 'sales',
                displayName: 'Merged',
                realmId,
            },
        });

        const entity = await repository.findOneBy({ realmId, path: 'sales' });
        expect(entity!.displayName).toEqual('Merged');
    });

    it('should remove the folder under the absent strategy', async () => {
        repository.seed({
            name: 'sales',
            path: 'sales',
            parentId: null,
            realmId,
            displayName: null,
            description: null,
        });

        await synchronizer.synchronize({
            strategy: { type: ProvisioningEntityStrategyType.ABSENT },
            attributes: {
                path: 'sales',
                realmId,
            },
        });

        expect(await repository.findOneBy({ realmId, path: 'sales' })).toBeNull();
    });
});

describe('core/provisioning/entities/path/validator', () => {
    const validator = new PathProvisioningValidator();
    const run = (data: Record<string, any>) => validator.run(data, { group: ValidatorGroup.PROVISIONING });

    it('should canonicalize a declared path', async () => {
        const output = await run({ attributes: { path: ' Sales/Berlin ' } });

        expect(output.attributes.path).toEqual('sales/berlin');
    });

    it('should refuse a malformed path', async () => {
        await expect(run({ attributes: { path: '/bad' } })).rejects.toThrow();
    });

    it('should never accept the derived chain from a file', async () => {
        const output = await run({
            attributes: {
                path: 'sales',
                name: 'evil',
                parentId: '9a5c1d3e-2b4f-4a6c-8d7e-1f2a3b4c5d6e',
                id: '5cb2b3fa-6a3a-4f1e-9a4f-2d1f6a1b0c11',
            },
        });

        expect(output.attributes).not.toHaveProperty('name');
        expect(output.attributes).not.toHaveProperty('parentId');
        expect(output.attributes).not.toHaveProperty('id');
    });
});
