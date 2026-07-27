/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { createFakeClient } from '../../src/testing';

async function resolveEndpoints(baseURL: string) {
    const client = createFakeClient({
        baseURL,
        handlers: { '*': () => ({ active: true }) },
    });

    await client.token.createWithClientCredentials({ client_id: 'id', client_secret: 'secret' });
    await client.token.introspect({ token: 'x' });
    await client.userInfo.get();

    return {
        authorize: client.authorize.buildURL(),
        requested: client.requests.map((request) => request.url),
    };
}

describe('src/client OAuth2 endpoint resolution', () => {
    it('preserves a base URL sub-path (no trailing slash)', async () => {
        const { authorize, requested } = await resolveEndpoints('https://example.com/api');

        expect(authorize).toBe('https://example.com/api/authorize?response_type=code');
        expect(requested).toEqual([
            'https://example.com/api/token',
            'https://example.com/api/token/introspect',
            'https://example.com/api/userinfo',
        ]);
    });

    it('preserves a base URL sub-path (with trailing slash)', async () => {
        const { requested } = await resolveEndpoints('https://example.com/api/');

        expect(requested[0]).toBe('https://example.com/api/token');
    });

    it('resolves against a root base URL', async () => {
        const { authorize, requested } = await resolveEndpoints('https://example.com');

        expect(authorize).toBe('https://example.com/authorize?response_type=code');
        expect(requested).toEqual([
            'https://example.com/token',
            'https://example.com/token/introspect',
            'https://example.com/userinfo',
        ]);
    });
});
