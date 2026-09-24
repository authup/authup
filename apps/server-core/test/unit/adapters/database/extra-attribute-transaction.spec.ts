/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType } from '@authup/access';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { PolicyEntity, PolicyRepository } from '../../../../src/adapters/database/domains/index.ts';
import { createTestApplication } from '../../../app/index.ts';
import { createFakeRole } from '../../../utils/index.ts';

// The parent row and its attribute rows are one transaction (#3668). The
// failing write is an attribute name longer than its varchar(255) column,
// which sqlite does not enforce, so the rollback is observable on mysql and
// postgres only.
const enforcesLength = ['mysql', 'postgres'].includes(process.env.DB_TYPE ?? '');

describe.skipIf(!enforcesLength)('adapters/database/extra-attribute-repository (transaction)', () => {
    const suite = createTestApplication();

    let repository: PolicyRepository;

    beforeAll(async () => {
        await suite.setup();
        repository = new PolicyRepository(suite.dataSource);
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('should roll the parent back when an attribute row write fails', async () => {
        const { name } = createFakeRole();
        const entity = repository.create({
            name,
            type: BuiltInPolicyType.COMPOSITE,
        });

        await expect(repository.saveOneWithEA<Record<string, any>>(entity, { ['x'.repeat(300)]: 'value' })).rejects.toThrow();

        const stored = await suite.dataSource.getRepository(PolicyEntity).findOneBy({ name });
        expect(stored).toBeNull();
    });

    it('should keep the stored attributes when an update fails', async () => {
        const { name } = createFakeRole();
        const entity = repository.create({
            name,
            type: BuiltInPolicyType.COMPOSITE,
        });
        await repository.saveOneWithEA<Record<string, any>>(entity, { decisionStrategy: 'unanimous' });

        entity.displayName = 'changed';
        await expect(repository.saveOneWithEA<Record<string, any>>(entity, { ['x'.repeat(300)]: 'value' })).rejects.toThrow();

        const stored = await suite.dataSource.getRepository(PolicyEntity).findOneByOrFail({ name });
        expect(stored.displayName).not.toEqual('changed');
        expect(await repository.findOneWithEAByPrimaryColumn(stored.id)).toEqual({ decisionStrategy: 'unanimous' });
    });
});
