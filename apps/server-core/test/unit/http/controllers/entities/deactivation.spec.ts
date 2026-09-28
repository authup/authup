/*
 * Copyright (c) 2026.
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
import { ErrorCode } from '@authup/errors';
import { OAuth2ErrorCode } from '@authup/specs';
import {
    createFakeClient,
    createFakeUser,
    expectClientError,
    httpRequest,
} from '../../../../utils';
import { createTestApplication } from '../../../../app';

describe('deactivation ends existing access', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    const bearer = (token: string, path: string) => httpRequest(suite, 'GET', path, { headers: { Authorization: `Bearer ${token}` } });

    it('a deactivated user loses its sessions and its bearer', async () => {
        const password = 'deactivate-me-password';
        const { data: user } = await suite.client.user.create(createFakeUser({ password }));

        const token = await suite.client.token.createWithPassword({
            username: user.name,
            password,
        });
        expect((await bearer(token.access_token, '/users/@me')).status).toEqual(200);

        await suite.client.user.update(user.id, { active: false });

        const refreshed = await httpRequest(suite, 'POST', '/token', {
            form: {
                grant_type: 'refresh_token',
                refresh_token: token.refresh_token!,
            },
        });
        expect(refreshed.status).toEqual(400);
        expect((await refreshed.json()).error).toEqual(OAuth2ErrorCode.INVALID_GRANT);

        expect((await bearer(token.access_token, '/users/@me')).status).toEqual(401);

        await expectClientError(
            () => suite.client.token.createWithPassword({ username: user.name, password }),
            { code: ErrorCode.ENTITY_INACTIVE },
        );
    });

    it('a deactivated client loses its bearer', async () => {
        const secret = 'deactivate-me-secret';
        const { data: client } = await suite.client.client.create({
            ...createFakeClient(),
            secret,
            secretHashed: false,
            secretEncrypted: false,
        });

        const token = await suite.client.token.createWithClientCredentials({
            client_id: client.id,
            client_secret: secret,
        });
        expect((await bearer(token.access_token, '/clients/@me')).status).toEqual(200);

        await suite.client.client.update(client.id, { active: false });

        expect((await bearer(token.access_token, '/clients/@me')).status).toEqual(401);
    });
});
