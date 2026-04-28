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

describe('http/controllers/client (self-manage)', () => {
    const suite = createTestApplication();

    let entity: ClientEntity;
    let selfClient: HTTPClient;
    const knownSecret = 'test-secret-123';

    beforeAll(async () => {
        await suite.setup();

        const created = await suite.client.client.create({
            ...createFakeClient(),
            is_confidential: true,
            secret: knownSecret,
            secret_hashed: false,
            secret_encrypted: false,
        });
        entity = created;

        const permission = await suite.client.permission.getOne(PermissionName.CLIENT_SELF_MANAGE);
        await suite.client.clientPermission.create({
            client_id: entity.id,
            permission_id: permission.id,
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
        const response = await selfClient.client.update(entity.id, { description: 'self-updated' });

        expect(response.description).toBe('self-updated');
    });

    it('should allow client to update its own redirect_uri and scope (allowed fields)', async () => {
        const response = await selfClient.client.update(entity.id, {
            redirect_uri: 'https://example.test/cb',
            scope: 'openid profile',
        });

        expect(response.redirect_uri).toBe('https://example.test/cb');
        expect(response.scope).toBe('openid profile');
    });

    it('should silently strip self-update of realm_id (validator drops on UPDATE)', async () => {
        const originalRealmId = entity.realm_id;
        const response = await selfClient.client.update(entity.id, { realm_id: '00000000-0000-0000-0000-000000000000' } as Partial<ClientEntity>);

        expect(response.realm_id).toBe(originalRealmId);
    });

    it('should reject self-update of active flag (rejected by ATTRIBUTE_NAMES policy)', async () => {
        await expect(
            selfClient.client.update(entity.id, { active: false } as Partial<ClientEntity>),
        ).rejects.toThrow();
    });

    it('should silently strip self-update of built_in flag (not in validator schema)', async () => {
        const response = await selfClient.client.update(entity.id, { built_in: true } as Partial<ClientEntity>);

        expect(response.built_in).toBe(false);
    });

    it('should allow client to rotate its own secret', async () => {
        const response = await selfClient.client.update(entity.id, { secret: 'rotated-secret-456' });

        expect(response.secret).toBeDefined();
    });

    it('should reject self-update of another client (not self)', async () => {
        const otherClient = await suite.client.client.create(createFakeClient());

        await expect(
            selfClient.client.update(otherClient.id, { description: 'hijacked' }),
        ).rejects.toThrow();
    });
});
