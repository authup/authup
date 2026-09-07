/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '@authup/core-kit';
import { ClientSecretMode, EventName, PermissionName } from '@authup/core-kit';
import { Client as HTTPClient } from '@authup/core-http-kit';
import { ErrorCode } from '@authup/errors';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { createTestApplication } from '../../../../app';
import { createFakeClient, expectClientError } from '../../../../utils';

/**
 * `POST /clients/:id/secret` (plan 105, #3351): the ONLY writer of a secret
 * on a client that is not in plain mode. The plaintext is handed back once
 * under `meta.secret`; the stored form is never derived back.
 */
describe('http/controllers/client (secret rotation)', () => {
    const suite = createTestApplication();

    let entity: Client;

    beforeAll(async () => {
        await suite.setup();

        const { data } = await suite.client.client.create({
            ...createFakeClient(),
            authMethod: 'secret',
            tokenBindingMethod: 'none',
            secret: 'start1234',
        });
        entity = data;
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('should rotate to a hashed secret that authenticates at /token while the old one stops', async () => {
        const { data, meta } = await suite.client.client.rotateSecret(entity.id, { mode: ClientSecretMode.HASHED });

        expect(meta.secret).toHaveLength(64);
        expect(data.secretHashed).toBe(true);
        expect(data.secretEncrypted).toBe(false);

        const grant = await suite.client.token.createWithClientCredentials({
            client_id: entity.id,
            client_secret: meta.secret,
        });
        expect(grant.access_token).toBeDefined();

        await expectClientError(
            () => suite.client.token.createWithClientCredentials({
                client_id: entity.id,
                client_secret: 'start1234',
            }),
            { status: 401, code: ErrorCode.OAUTH_CLIENT_INVALID },
        );
    });

    it('should refuse a secret on the update path of a hashed client', async () => {
        await expectClientError(
            () => suite.client.client.update(entity.id, { secret: 'sneaky-downgrade' }),
            { status: 400, code: ErrorCode.BAD_REQUEST },
        );
    });

    it('should record a clientSecretRotated event carrying the mode and never the secret', async () => {
        const { data: events } = await suite.client.event.getMany({ filters: { name: EventName.CLIENT_SECRET_ROTATED } });

        expect(events).toHaveLength(1);
        expect(events[0].refId).toEqual(entity.id);
        expect(events[0].data).toMatchObject({ kind: ClientSecretMode.HASHED });
        expect(JSON.stringify(events[0])).not.toContain('start1234');
    });

    it('should rotate back to a plain secret an admin can read', async () => {
        const { meta } = await suite.client.client.rotateSecret(entity.id, {
            secret: 'plain-rotated',
            mode: ClientSecretMode.PLAIN,
        });
        expect(meta.secret).toEqual('plain-rotated');

        const { data } = await suite.client.client.getOne(entity.id, { fields: ['+secret'] });
        expect(data.secret).toEqual('plain-rotated');
        expect(data.secretHashed).toBe(false);
    });

    it('should refuse the encrypted mode until it is implemented', async () => {
        await expectClientError(
            () => suite.client.client.rotateSecret(entity.id, { mode: ClientSecretMode.ENCRYPTED }),
            { status: 400, code: ErrorCode.BAD_REQUEST },
        );

        await expectClientError(
            () => suite.client.client.create({ ...createFakeClient(), secretEncrypted: true }),
            { status: 400, code: ErrorCode.BAD_REQUEST },
        );
    });

    it('should refuse a public client (nothing to rotate)', async () => {
        const { data: publicClient } = await suite.client.client.create({
            ...createFakeClient(),
            authMethod: 'none',
            tokenBindingMethod: 'none',
        });

        await expectClientError(
            () => suite.client.client.rotateSecret(publicClient.id),
            { status: 400, code: ErrorCode.BAD_REQUEST },
        );
    });

    it('should let a client rotate its own secret through @me under CLIENT_SELF_MANAGE', async () => {
        const knownSecret = 'self-secret-123';
        const { data: self } = await suite.client.client.create({
            ...createFakeClient(),
            authMethod: 'secret',
            tokenBindingMethod: 'none',
            secret: knownSecret,
        });

        const { data: permission } = await suite.client.permission.getOne(PermissionName.CLIENT_SELF_MANAGE);
        await suite.client.clientPermission.create({
            clientId: self.id,
            permissionId: permission.id,
        });

        const grant = await suite.client.token.createWithClientCredentials({
            client_id: self.id,
            client_secret: knownSecret,
        });

        const selfClient = new HTTPClient({ baseURL: suite.baseURL });
        selfClient.setAuthorizationHeader({ type: 'Bearer', token: grant.access_token });

        const { data, meta } = await selfClient.client.rotateSecret('@me');
        expect(data.id).toEqual(self.id);
        expect(meta.secret).not.toEqual(knownSecret);

        const rotated = await suite.client.token.createWithClientCredentials({
            client_id: self.id,
            client_secret: meta.secret,
        });
        expect(rotated.access_token).toBeDefined();

        // a mode change is a denylisted attribute for a self-managing client
        await expectClientError(
            () => selfClient.client.rotateSecret('@me', { mode: ClientSecretMode.HASHED }),
            { status: 403 },
        );

        // and another client's secret is out of reach entirely
        await expectClientError(
            () => selfClient.client.rotateSecret(entity.id),
            { status: 403 },
        );
    });
});
