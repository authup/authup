/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client as ClientEntity } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import { Client as HTTPClient } from '@authup/core-http-kit';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { createTestApplication } from '../../../../app';
import { createFakeClient } from '../../../../utils';
import { createFakeTimePolicy } from '../../../../utils/domains/policy';

describe('http/controllers/client (self-manage)', () => {
    const suite = createTestApplication();

    let entity: ClientEntity;
    let selfClient: HTTPClient;
    const knownSecret = 'test-secret-123';

    beforeAll(async () => {
        await suite.setup();

        const { data: created } = await suite.client.client.create({
            ...createFakeClient(),
            authMethod: 'secret',
            tokenBindingMethod: 'none',
            secret: knownSecret,
            secretHashed: false,
            secretEncrypted: false,
        });
        entity = created;

        const { data: permission } = await suite.client.permission.getOne(PermissionName.CLIENT_SELF_MANAGE);
        await suite.client.clientPermission.create({
            clientId: entity.id,
            permissionId: permission.id,
        });

        const tokenResponse = await suite.client.token.createWithClientCredentials({
            client_id: entity.id,
            client_secret: knownSecret,
        });

        selfClient = new HTTPClient({ baseURL: suite.baseURL });
        selfClient.setAuthorizationHeader({
            type: 'Bearer',
            token: tokenResponse.access_token,
        });
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('should allow client to update its own description (allowed field)', async () => {
        const { data: response } = await selfClient.client.update(entity.id, { description: 'self-updated' });

        expect(response.description).toBe('self-updated');
    });

    it('should allow client to update its own redirect_uri and scope (allowed fields)', async () => {
        const { data: response } = await selfClient.client.update(entity.id, {
            redirectUri: 'https://example.test/cb',
            scope: 'openid profile',
        });

        expect(response.redirectUri).toBe('https://example.test/cb');
        expect(response.scope).toBe('openid profile');
    });

    it('should silently strip self-update of realm_id (validator drops on UPDATE)', async () => {
        const originalRealmId = entity.realmId;
        const { data: response } = await selfClient.client.update(entity.id, { realmId: '00000000-0000-0000-0000-000000000000' } as Partial<ClientEntity>);

        expect(response.realmId).toBe(originalRealmId);
    });

    it('should reject self-update of active flag (rejected by ATTRIBUTE_NAMES policy)', async () => {
        await expect(
            selfClient.client.update(entity.id, { active: false } as Partial<ClientEntity>),
        ).rejects.toThrow();
    });

    it('should reject self-update of access_policy_id (rejected by ATTRIBUTE_NAMES policy)', async () => {
        // a real policy id — the rejection must come from the self-manage
        // denylist, not from a dangling-FK validation error
        const { data: policy } = await suite.client.policy.create(createFakeTimePolicy());

        await expect(
            selfClient.client.update(entity.id, { accessPolicyId: policy.id }),
        ).rejects.toThrow();
    });

    it('should silently strip self-update of built_in flag (not in validator schema)', async () => {
        const { data: response } = await selfClient.client.update(entity.id, { builtIn: true } as Partial<ClientEntity>);

        expect(response.builtIn).toBe(false);
    });

    it('should allow client to rotate its own secret', async () => {
        const { data: response } = await selfClient.client.update(entity.id, { secret: 'rotated-secret-456' });

        expect(response.secret).toBeDefined();
    });

    it('should reject self-update of another client (not self)', async () => {
        const { data: otherClient } = await suite.client.client.create(createFakeClient());

        await expect(
            selfClient.client.update(otherClient.id, { description: 'hijacked' }),
        ).rejects.toThrow();
    });
});
