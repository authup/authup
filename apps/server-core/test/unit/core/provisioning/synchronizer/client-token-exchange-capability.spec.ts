/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { ClientTokenExchangeRealmScope } from '@authup/core-kit';
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { ClientTokenExchangeCapabilityProvisioningSynchronizer } from '../../../../../src/core/provisioning/synchronizer/client-token-exchange-capability/index.ts';
import type { ClientTokenExchangeCapabilityProvisioningEntity } from '../../../../../src/core/provisioning/entities/client-token-exchange-capability/index.ts';
import { ProvisioningEntityStrategyType } from '../../../../../src/core/provisioning/strategy/index.ts';
import { FakeClientTokenExchangeCapabilityRepository } from '../../entities/client-token-exchange-capability/fake-repository.ts';

describe('core/provisioning/synchronizer/client-token-exchange-capability', () => {
    const clientId = randomUUID();
    const realmId = randomUUID();

    let repository: FakeClientTokenExchangeCapabilityRepository;
    let synchronizer: ClientTokenExchangeCapabilityProvisioningSynchronizer;

    beforeEach(() => {
        repository = new FakeClientTokenExchangeCapabilityRepository();
        synchronizer = new ClientTokenExchangeCapabilityProvisioningSynchronizer({ repository });
    });

    function buildInput(
        strategy?: ClientTokenExchangeCapabilityProvisioningEntity['strategy'],
        attributes: ClientTokenExchangeCapabilityProvisioningEntity['attributes'] = {},
    ): ClientTokenExchangeCapabilityProvisioningEntity {
        return {
            strategy,
            attributes: {
                clientId,
                realmId,
                audience: 'storage',
                value: 'bucket',
                maxAge: 600,
                ...attributes,
            },
        };
    }

    it('should create a capability in the own realm scope unless the file names one', async () => {
        await synchronizer.synchronize(buildInput());

        expect(repository.getAll()).toHaveLength(1);
        expect(repository.getAll()[0]).toMatchObject({
            clientId,
            realmId,
            audience: 'storage',
            realmScope: ClientTokenExchangeRealmScope.OWN,
        });
    });

    it('should leave an existing capability alone by default', async () => {
        await synchronizer.synchronize(buildInput());
        await synchronizer.synchronize(buildInput(undefined, { value: 'bucket-file', maxAge: 60 }));

        expect(repository.getAll()).toHaveLength(1);
        expect(repository.getAll()[0]).toMatchObject({ value: 'bucket', maxAge: 600 });
    });

    it('should treat the same audience of another client as a different capability', async () => {
        await synchronizer.synchronize(buildInput());
        await synchronizer.synchronize(buildInput(undefined, { clientId: randomUUID() }));

        expect(repository.getAll()).toHaveLength(2);
    });

    it('should merge what the file declares and keep the scope it does not name', async () => {
        await synchronizer.synchronize(buildInput(undefined, { realmScope: ClientTokenExchangeRealmScope.ANY }));
        await synchronizer.synchronize(buildInput({ type: ProvisioningEntityStrategyType.MERGE }, { value: 'bucket-file' }));

        expect(repository.getAll()).toHaveLength(1);
        expect(repository.getAll()[0]).toMatchObject({
            value: 'bucket-file',
            realmScope: ClientTokenExchangeRealmScope.ANY,
        });
    });

    it('should merge only the attributes the strategy lists', async () => {
        await synchronizer.synchronize(buildInput());
        await synchronizer.synchronize(buildInput(
            { type: ProvisioningEntityStrategyType.MERGE, attributes: ['maxAge'] },
            { value: 'bucket-file', maxAge: 60 },
        ));

        expect(repository.getAll()[0]).toMatchObject({ value: 'bucket', maxAge: 60 });
    });

    it('should reset an undeclared scope on replace and keep the row', async () => {
        await synchronizer.synchronize(buildInput(undefined, { realmScope: ClientTokenExchangeRealmScope.ANY }));

        const [before] = repository.getAll();

        await synchronizer.synchronize(buildInput({ type: ProvisioningEntityStrategyType.REPLACE }));

        expect(repository.getAll()).toHaveLength(1);
        expect(repository.getAll()[0]).toMatchObject({
            id: before!.id,
            realmScope: ClientTokenExchangeRealmScope.OWN,
        });
    });

    it('should refuse creating a row the declaration does not complete', async () => {
        await expect(synchronizer.synchronize({
            attributes: {
                clientId,
                realmId,
                audience: 'storage',
            },
        }))
            .rejects.toThrow(/storage/);

        expect(repository.getAll()).toHaveLength(0);
    });

    it('should accept a partial merge of an existing row', async () => {
        await synchronizer.synchronize(buildInput());
        await synchronizer.synchronize({
            strategy: { type: ProvisioningEntityStrategyType.MERGE },
            attributes: {
                clientId,
                realmId,
                audience: 'storage',
                maxAge: 60,
            },
        });

        expect(repository.getAll()[0]).toMatchObject({ value: 'bucket', maxAge: 60 });
    });

    it('should not act on a row a case-insensitive collation matched', async () => {
        await synchronizer.synchronize(buildInput());

        const [stored] = repository.getAll();

        vi.spyOn(repository, 'findOneBy').mockResolvedValueOnce({ ...stored!, audience: 'storage' });

        await synchronizer.synchronize(buildInput({ type: ProvisioningEntityStrategyType.ABSENT }, { audience: 'Storage' }));

        expect(repository.getAll()).toHaveLength(1);
    });

    it('should remove a capability declared absent and tolerate a missing one', async () => {
        await synchronizer.synchronize(buildInput());
        await synchronizer.synchronize(buildInput({ type: ProvisioningEntityStrategyType.ABSENT }));

        expect(repository.getAll()).toHaveLength(0);

        await expect(synchronizer.synchronize(buildInput({ type: ProvisioningEntityStrategyType.ABSENT }))).resolves.toBeDefined();
    });
});
