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
import { SessionEntity } from '../../../../../src/adapters/database/domains/session/entity.ts';
import { SESSION_COOKIE, hashSessionSecret } from '../../../../../src/core';
import { createTestApplication } from '../../../../app';
import { httpRequest } from '../../../../utils';

const PUBLIC_URL = 'https://authup.test';
const COOKIE = `__Host-${SESSION_COOKIE}`;

describe('session cookie sign-out on an https root deployment', () => {
    const suite = createTestApplication({
        config: (config) => {
            config.publicUrl = PUBLIC_URL;
        },
    });

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('clears the prefixed cookie when the own session is deleted', async () => {
        const token = await suite.client.token.createWithPassword({ username: 'admin', password: 'start123' });
        const client = new HTTPClient({ baseURL: suite.baseURL });
        client.setAuthorizationHeader({ type: 'Bearer', token: token.access_token });
        const introspect = await client.token.introspect({ token: token.access_token }, { authorizationHeaderInherit: true });

        const secret = 'console-session-sign-out';
        await suite.dataSource
            .getRepository(SessionEntity)
            .update({ id: introspect.session_id! }, { secret: hashSessionSecret(secret) });

        const response = await httpRequest(suite, 'DELETE', '/sessions/@me', {
            headers: {
                cookie: `${COOKIE}=${secret}`,
                'sec-fetch-site': 'same-origin',
                origin: PUBLIC_URL,
            },
        });

        expect(response.status).toEqual(202);

        const setCookie = response.headers
            .getSetCookie()
            .find((value) => value.startsWith(`${COOKIE}=`)) as string;
        expect(setCookie).toBeDefined();
        expect(setCookie).toContain('Max-Age=0');
        expect(setCookie).toContain('Secure');
        expect(setCookie).toContain('Path=/');
    });
});
