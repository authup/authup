/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { Client as HTTPClient } from '@authup/core-http-kit';
import { createFakeUser, expectClientError } from '../../../../utils';
import { createTestApplication } from '../../../../app';

describe('session', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    function bearer(token: string): HTTPClient {
        const client = new HTTPClient({ baseURL: suite.baseURL });
        client.setAuthorizationHeader({ type: 'Bearer', token });
        return client;
    }

    it('lists an admin\'s sessions and reflects a per-session revoke', async () => {
        const first = await suite.client.token.createWithPassword({ username: 'admin', password: 'start123' });
        const second = await suite.client.token.createWithPassword({ username: 'admin', password: 'start123' });

        const client = bearer(first.access_token);

        const introspect = await client.token.introspect({ token: first.access_token });
        const adminId = introspect.sub!;
        const currentId = introspect.session_id!;

        const list = await client.session.getMany({ filter: { user_id: adminId } });
        expect(list.data.length).toBeGreaterThanOrEqual(2);
        expect(list.data.every((s) => s.sub === adminId)).toBe(true);

        // revoke the OTHER (non-current) admin session
        const other = list.data.find((s) => s.id !== currentId);
        expect(other).toBeDefined();
        await client.session.delete(other!.id);

        const after = await client.session.getMany({ filter: { user_id: adminId } });
        expect(after.data.some((s) => s.id === other!.id)).toBe(false);
        // the current session is untouched
        expect(after.data.some((s) => s.id === currentId)).toBe(true);
        expect(second).toBeDefined();
    });

    it('revokes every session of the actor except the current one', async () => {
        await suite.client.token.createWithPassword({ username: 'admin', password: 'start123' });
        await suite.client.token.createWithPassword({ username: 'admin', password: 'start123' });
        const current = await suite.client.token.createWithPassword({ username: 'admin', password: 'start123' });

        const client = bearer(current.access_token);
        const introspect = await client.token.introspect({ token: current.access_token });
        const adminId = introspect.sub!;
        const currentId = introspect.session_id!;

        await client.session.deleteMany();

        // only the current admin session remains
        const after = await client.session.getMany({ filter: { user_id: adminId } });
        const own = after.data.filter((s) => s.sub === adminId);
        expect(own).toHaveLength(1);
        expect(own[0].id).toEqual(currentId);
    });

    it('scopes a non-privileged user to its own sessions', async () => {
        const password = 'session-self-user-pw';
        const fakeUser = createFakeUser({ password });
        await suite.client.user.create(fakeUser);

        const login = await suite.client.token.createWithPassword({
            username: fakeUser.name,
            password,
        });

        const client = bearer(login.access_token);
        const introspect = await client.token.introspect({ token: login.access_token });

        const list = await client.session.getMany();
        // self-service: only the user's own sessions, never anyone else's
        expect(list.data.length).toBeGreaterThanOrEqual(1);
        expect(list.data.every((s) => s.sub === introspect.sub)).toBe(true);

        // the user can revoke its own current session (@me)
        await client.session.delete(introspect.session_id!);
    });

    it('lets an admin force-logout a target user everywhere', async () => {
        const password = 'session-target-user-pw';
        const fakeUser = createFakeUser({ password });
        const user = await suite.client.user.create(fakeUser);

        // two sessions for the target user
        await suite.client.token.createWithPassword({ username: fakeUser.name, password });
        await suite.client.token.createWithPassword({ username: fakeUser.name, password });

        const before = await suite.client.session.getMany({ filter: { user_id: user.id } });
        expect(before.data.length).toBeGreaterThanOrEqual(2);

        const result = await suite.client.session.deleteMany({ userId: user.id });
        expect(result.count).toBeGreaterThanOrEqual(2);

        // every session of the target user is gone
        const after = await suite.client.session.getMany({ filter: { user_id: user.id } });
        expect(after.data).toHaveLength(0);
    });

    it('denies a non-privileged user from force-logging-out another user', async () => {
        const password = 'session-nonpriv-pw';
        const fakeUser = createFakeUser({ password });
        await suite.client.user.create(fakeUser);

        const login = await suite.client.token.createWithPassword({ username: fakeUser.name, password });
        const client = bearer(login.access_token);

        // passing a target user_id takes the admin path → 403 (lacks SESSION_DELETE)
        await expectClientError(
            () => client.session.deleteMany({ userId: randomUUID() }),
            { status: 403 },
        );

        // the no-arg self path is unaffected
        const result = await client.session.deleteMany();
        expect(result.count).toBeGreaterThanOrEqual(0);
    });
});
