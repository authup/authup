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
import { BuiltInPolicyType, SystemPolicyName } from '@authup/access';
import { Client } from '@authup/core-http-kit';
import { PermissionName } from '@authup/core-kit';
import { createNanoID } from '@authup/kit';
import { PolicyRepository } from '../../../../../../src';
import { createTestApplication } from '../../../../../app';
import { createFakeUser, createScopeRestrictedClient, expectClientError } from '../../../../../utils';

// Service-level coverage of the DB-backed policy-checker lives in
// test/unit/core/identity/policy/checker.spec.ts. The HTTP tests below
// pin the controller's auth gate, the status-code / response-shape contract,
// the identity and scope rule, which only the controller applies, and the
// permission_check gate on naming a subject.

describe('http/controllers/entities/policy/checker', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('returns status=error with the serialized error for an unknown name', async () => {
        const name = createNanoID();
        const response = await suite.client.policy.check(name);

        expect(response).toBeDefined();
        expect(response.status).toEqual('error');
        expect(response.data).toBeDefined();
        expect(typeof response.data!.message).toBe('string');
    });

    it('returns the checker result body with a 202 response', async () => {
        const policyRepository = new PolicyRepository(suite.dataSource);
        const policy = await policyRepository.save(policyRepository.create({
            type: BuiltInPolicyType.IDENTITY,
            name: BuiltInPolicyType.IDENTITY,
            builtIn: true,
        }));

        const response = await suite.client.policy.check(policy.id);
        expect(response).toBeDefined();
        expect(response.status).toMatch(/^(success|error)$/);
    });

    it('answers a bearer without the global scope an error, and refuses it naming a subject (#3604)', async () => {
        const policyRepository = new PolicyRepository(suite.dataSource);
        const policy = await policyRepository.save(policyRepository.create({
            type: BuiltInPolicyType.IDENTITY,
            name: createNanoID(),
            builtIn: true,
        }));

        const control = await suite.client.policy.check(policy.id);
        expect(control.status).toEqual('success');

        // no anonymous opt-out: a present identity names a subject, and null names none
        await expectClientError(
            () => suite.client.policy.check(policy.id, { identity: null }),
            { status: 400 },
        );

        const { client, payload } = await createScopeRestrictedClient(suite);

        const bare = await client.policy.check(policy.id);
        expect(bare.status).toEqual('error');

        await expectClientError(
            () => client.policy.check(policy.id, { identity: { type: payload.sub_kind, id: payload.sub } }),
            { status: 403 },
        );
    });

    it('answers for the subject a permission_check holder names (#3604)', async () => {
        const { data: admin } = await suite.client.user.getOne('@me');
        const { data: subject } = await suite.client.user.create(createFakeUser());
        const permissionBinding = {
            permission: {
                name: PermissionName.USER_UPDATE,
                realmId: null,
                clientId: null,
            },
        };

        const self = await suite.client.policy.check(SystemPolicyName.PERMISSION_BINDING, {
            identity: { type: 'user', id: admin.id },
            permissionBinding,
        });
        expect(self.status).toEqual('success');

        const other = await suite.client.policy.check(SystemPolicyName.PERMISSION_BINDING, {
            identity: { type: 'user', id: subject.id },
            permissionBinding,
        });
        expect(other.status).toEqual('error');
    });

    it('refuses a caller without permission_check that names a subject (#3604)', async () => {
        const { data: admin } = await suite.client.user.getOne('@me');

        const password = 'start123-policy-checker-ungranted';
        const { data: user } = await suite.client.user.create(createFakeUser({ password }));
        const grant = await suite.client.token.createWithPassword({ username: user.name, password });

        const client = new Client({ baseURL: suite.baseURL });
        client.setAuthorizationHeader({ type: 'Bearer', token: grant.access_token });

        await expectClientError(
            () => client.policy.check(SystemPolicyName.PERMISSION_BINDING, {
                identity: { type: 'user', id: admin.id },
                permissionBinding: {
                    permission: {
                        name: PermissionName.USER_UPDATE,
                        realmId: null,
                        clientId: null,
                    },
                },
            }),
            { status: 403 },
        );
    });
});
