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
import { Client as HTTPClient } from '@authup/core-http-kit';
import { PermissionName } from '@authup/core-kit';
import { createFakeUser, httpRequest } from '../../../../utils';
import { createTestApplication } from '../../../../app';

describe('password change ends the other sessions', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    const login = (username: string, password: string) => suite.client.token.createWithPassword({
        username,
        password,
    });

    const refresh = (refreshToken: string) => httpRequest(suite, 'POST', '/token', {
        form: {
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
        },
    });

    const me = (accessToken: string) => httpRequest(suite, 'GET', '/users/@me', { headers: { Authorization: `Bearer ${accessToken}` } });

    it('a self-service change keeps only the current session', async () => {
        const password = 'change-before-password';
        const { data: user } = await suite.client.user.create(createFakeUser({ password }));
        const { data: permission } = await suite.client.permission.getOne(PermissionName.USER_SELF_MANAGE);
        await suite.client.userPermission.create({
            userId: user.id,
            permissionId: permission.id,
        });

        const current = await login(user.name, password);
        const other = await login(user.name, password);

        const self = new HTTPClient({ baseURL: suite.baseURL });
        self.setAuthorizationHeader({ type: 'Bearer', token: current.access_token });
        await self.user.update(user.id, { password: 'change-after-password' });

        const refreshed = await refresh(other.refresh_token!);
        expect(refreshed.status).toEqual(400);
        expect((await me(other.access_token)).status).toEqual(401);

        expect((await me(current.access_token)).status).toEqual(200);
        expect((await refresh(current.refresh_token!)).status).toEqual(200);
    });

    it('an administrator changing the password ends every session', async () => {
        const password = 'admin-change-before-password';
        const { data: user } = await suite.client.user.create(createFakeUser({ password }));

        const session = await login(user.name, password);

        await suite.client.user.update(user.id, { password: 'admin-change-after-password' });

        expect((await refresh(session.refresh_token!)).status).toEqual(400);
        expect((await me(session.access_token)).status).toEqual(401);
    });
});
