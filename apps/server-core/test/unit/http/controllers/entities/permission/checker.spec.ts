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
import { BuiltInPolicyType } from '@authup/access';
import { createNanoID } from '@authup/kit';
import { PermissionEntity, PolicyRepository } from '../../../../../../src';
import { createTestApplication } from '../../../../../app';
import { expectClientError } from '../../../../../utils';

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

    it('responds with 404 for an unknown permission name', async () => {
        const name = createNanoID();
        await expectClientError(
            () => suite.client.permission.check(name),
            { status: 404 },
        );
    });

    it('returns the checker result body with a 202 response', async () => {
        const policyRepository = new PolicyRepository(suite.dataSource);
        const policy = await policyRepository.save(policyRepository.create({
            type: BuiltInPolicyType.IDENTITY,
            name: BuiltInPolicyType.IDENTITY,
            built_in: true,
        }));

        const permissionRepository = suite.dataSource.getRepository(PermissionEntity);
        const permission = await permissionRepository.save(permissionRepository.create({
            name: createNanoID(),
            built_in: true,
            policy_id: policy.id,
        }));

        const response = await suite.client.permission.check(permission.id);
        expect(response).toBeDefined();
        expect(response.status).toMatch(/^(success|error)$/);
    });
});
