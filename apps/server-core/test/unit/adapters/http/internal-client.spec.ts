/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import http from 'node:http';
import type { AddressInfo } from 'node:net';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import {
    createInternalHttpClient,
    toDialableOrigin,
} from '../../../../src/adapters/http/internal-client/index.ts';

describe('toDialableOrigin', () => {
    it.each([
        ['http://0.0.0.0:64331/', 'http://127.0.0.1:64331'],
        // WHATWG URL serializes an IPv6 hostname WITH brackets
        ['http://[::]:64331/', 'http://127.0.0.1:64331'],
        ['http://localhost:3010/', 'http://localhost:3010'],
        ['http://[::1]:3010', 'http://[::1]:3010'],
        ['http://0.0.0.0:3000/some/path', 'http://127.0.0.1:3000'],
    ])('should dial %s at %s', (input, expected) => {
        expect(toDialableOrigin(input)).toEqual(expected);
    });
});

describe('createInternalHttpClient', () => {
    let server : http.Server;
    let port : number;
    const seen : string[] = [];

    beforeAll(async () => {
        server = http.createServer((req, res) => {
            seen.push(req.url ?? '');
            res.setHeader('content-type', 'application/json');
            res.end('{}');
        });

        await new Promise<void>((resolve) => {
            server.listen(0, '0.0.0.0', resolve);
        });

        port = (server.address() as AddressInfo).port;
    });

    afterAll(async () => {
        await new Promise((resolve) => {
            server.close(resolve);
        });
    });

    it('keeps the public url as baseURL so rendered hrefs stay user-facing', () => {
        const client = createInternalHttpClient({
            publicURL: 'https://hub.local/auth',
            internalURL: 'http://localhost:3010/',
        });

        expect(client.getBaseURL()).toEqual('https://hub.local/auth');
        expect(client.identityProvider.getAuthorizeUri('foo')).toContain('https://hub.local/auth');
    });

    it('dials a wildcard listen address at loopback, without the public prefix', async () => {
        // the public url is unreachable, so a request that is not rewritten
        // fails instead of passing unnoticed
        const client = createInternalHttpClient({
            publicURL: 'https://hub.invalid/auth',
            internalURL: `http://0.0.0.0:${port}/`,
        });

        seen.length = 0;

        await client.status.get();
        await client.realm.getMany({ filters: { name: 'master' } });
        // the absolute OAuth2 endpoints are built from the base url
        await client.token.introspect({ token: 'token' }, { authorizationHeaderInherit: true })
            .catch(() => undefined);

        expect(seen[0]).toEqual('/');
        expect(seen[1]?.startsWith('/realms?')).toBe(true);
        expect(seen[2]).toEqual('/token/introspect');
    });

    it('leaves a request outside the public prefix alone', async () => {
        const client = createInternalHttpClient({
            publicURL: `http://127.0.0.1:${port}/auth`,
            internalURL: 'http://127.0.0.1:1/',
        });

        seen.length = 0;

        // same origin, sibling path: not under the prefix, so dialed as is
        await client.request({ url: `http://127.0.0.1:${port}/authz` });

        expect(seen).toEqual(['/authz']);
    });
});
