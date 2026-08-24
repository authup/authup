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
import { createFakeClient, createFakeUser } from '../../../../utils';
import { createTestApplication } from '../../../../app';

describe('session-include', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    function bearer(token: string) : HTTPClient {
        const client = new HTTPClient({ baseURL: suite.baseURL });
        client.setAuthorizationHeader({ type: 'Bearer', token });
        return client;
    }

    it('hydrates user & realm relations for an admin reader', async () => {
        const login = await suite.client.token.createWithPassword({ username: 'admin', password: 'start123' });
        const introspect = await bearer(login.access_token).token.introspect({ token: login.access_token }, { authorizationHeaderInherit: true });

        const list = await suite.client.session.getMany({
            filters: { userId: introspect.sub as string },
            relations: ['user', 'realm'],
        });

        expect(list.data.length).toBeGreaterThanOrEqual(1);
        for (const row of list.data) {
            expect(row.user).toBeDefined();
            expect(row.user!.name).toEqual('admin');
            expect(row.realm).toBeDefined();
        }
    });

    it('hydrates the client relation for a client-subject session', async () => {
        const secret = 'session-include-client-secret';
        const { data: created } = await suite.client.client.create({
            ...createFakeClient(),
            secret,
            secretHashed: false,
            secretEncrypted: false,
        });

        await suite.client.token.createWithClientCredentials({
            client_id: created.id,
            client_secret: secret,
        });

        const list = await suite.client.session.getMany({
            filters: { clientId: created.id },
            relations: ['client'],
        });

        expect(list.data.length).toBeGreaterThanOrEqual(1);
        for (const row of list.data) {
            expect(row.client).toBeDefined();
            expect(row.client!.name).toEqual(created.name);
        }
    });

    it('strips the user include for a reader without USER_READ', async () => {
        const password = 'session-include-self-pw';
        const fakeUser = createFakeUser({ password });
        await suite.client.user.create(fakeUser);

        const login = await suite.client.token.createWithPassword({
            username: fakeUser.name,
            password,
        });

        const list = await bearer(login.access_token).session.getMany({ relations: ['user'] });

        expect(list.data.length).toBeGreaterThanOrEqual(1);
        for (const row of list.data) {
            expect(row.user).toBeUndefined();
        }
    });
});
