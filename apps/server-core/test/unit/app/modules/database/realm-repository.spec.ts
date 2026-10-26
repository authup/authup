/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { REALM_MASTER_NAME } from '@authup/core-kit';
import { isValidationError } from '@authup/errors';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { RealmEntity } from '../../../../../src/adapters/database/domains/index.ts';
import { RealmRepositoryAdapter } from '../../../../../src/app/modules/database/repositories/index.ts';
import { createTestDatabaseApplication } from '../../../../app';

describe('app/modules/database/repositories/realm', () => {
    const suite = createTestDatabaseApplication();

    let realms : RealmRepositoryAdapter;

    beforeAll(async () => {
        await suite.setup();

        realms = new RealmRepositoryAdapter(suite.dataSource.getRepository(RealmEntity));
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('should resolve a realm by name and by id', async () => {
        const byName = await realms.resolveOrFail(REALM_MASTER_NAME);
        expect(byName.name).toEqual(REALM_MASTER_NAME);

        const byId = await realms.resolveOrFail(byName.id);
        expect(byId.id).toEqual(byName.id);
    });

    it('should refuse a key that names no realm with a validation error', async () => {
        const key = randomUUID();

        await expect(realms.resolveOrFail(key)).rejects.toSatisfy(
            (e: unknown) => isValidationError(e) && (e as Error).message.includes(key),
        );
    });
});
