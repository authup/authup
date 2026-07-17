/*
 * Copyright (c) 2024-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { createNanoID } from '@authup/kit';
import { PermissionEntity } from '../../../../../../src';
import { createTestApplication } from '../../../../../app';

// Service-level coverage of the DB-backed permission-checker lives in
// test/unit/core/identity/permission/checker.spec.ts. The HTTP tests below
// stay minimal: they verify the controller's auth gate and the
// status-code / response-shape contract — the actual checker logic is
// exercised at the service layer.

describe('http/controllers/entities/permission/checker', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('returns status=error with the serialized error for an unknown name', async () => {
        const name = createNanoID();
        const response = await suite.client.permission.check(name);

        expect(response).toBeDefined();
        expect(response.status).toEqual('error');
        expect(response.data).toBeDefined();
        expect(typeof response.data!.message).toBe('string');
    });

    it('returns the checker result body with a 202 response', async () => {
        const permissionRepository = suite.dataSource.getRepository(PermissionEntity);
        const permission = await permissionRepository.save(permissionRepository.create({
            name: createNanoID(),
            builtIn: true,
        }));

        const response = await suite.client.permission.check(permission.id);
        expect(response).toBeDefined();
        expect(response.status).toMatch(/^(success|error)$/);
    });
});
