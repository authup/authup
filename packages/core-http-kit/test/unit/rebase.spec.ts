/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { MemoryTransport } from 'hapic';
import { describe, expect, it } from 'vitest';
import {
    Client,
    createBaseURLRewriter,
    createRebasedTransport,
} from '../../src';

const PROVIDER_ID = '11111111-1111-1111-1111-111111111111';

describe('src/client/rebase', () => {
    describe('createBaseURLRewriter', () => {
        it.each([
            ['https://idp.example.com', 'http://127.0.0.1:3000', 'https://idp.example.com/authorize/info?x=1', 'http://127.0.0.1:3000/authorize/info?x=1'],
            ['https://idp.example.com/', 'http://127.0.0.1:3000/', 'https://idp.example.com/realms', 'http://127.0.0.1:3000/realms'],
            ['https://idp.example.com/auth', 'http://core:3000', 'https://idp.example.com/auth/realms', 'http://core:3000/realms'],
            ['https://idp.example.com/auth', 'http://core:3000', 'https://idp.example.com/auth', 'http://core:3000/'],
            ['https://idp.example.com/auth', 'http://core:3000', 'https://idp.example.com/auth?x=1', 'http://core:3000/?x=1'],
            ['https://idp.example.com/auth/', 'http://proxy/strip/', 'https://idp.example.com/auth/token', 'http://proxy/strip/token'],
            ['https://IDP.example.com:443/auth', 'http://core:3000', 'https://idp.example.com/auth/token', 'http://core:3000/token'],
            ['http://[2001:db8::1]:8080', 'http://[fd00::1]:3000/internal', 'http://[2001:db8::1]:8080/users', 'http://[fd00::1]:3000/internal/users'],
            ['https://idp.example.com', 'http://core:3000', 'https://idp.example.com//evil.test/x', 'http://core:3000//evil.test/x'],
            ['https://idp.example.com', 'http://core:3000', 'https://idp.example.com/users?filter%5Bname%5D=a%2Fb&x=%3D', 'http://core:3000/users?filter%5Bname%5D=a%2Fb&x=%3D'],
        ])('should move %s onto %s (%s)', (from, to, input, expected) => {
            expect(createBaseURLRewriter(from, to)(input)).toEqual(expected);
        });

        it.each([
            'https://idp.example.com/authz/a',
            'https://idp.example.com/auth-other',
            'https://idp.example.com.evil.test/auth/a',
            'https://idp.example.com:8443/auth/a',
            'http://idp.example.com/auth/a',
            'https://other.example.com/auth/a',
            'https://idp.example.com@evil.test/auth/a',
            '/auth/a',
            'not a url',
        ])('should leave %s alone', (input) => {
            const rewrite = createBaseURLRewriter('https://idp.example.com/auth', 'http://core:3000');

            expect(rewrite(input)).toEqual(input);
        });

        it('should keep the authority when the remainder starts with two slashes', () => {
            const rewrite = createBaseURLRewriter('https://idp.example.com', 'http://core:3000');

            expect(new URL(rewrite('https://idp.example.com//evil.test/x')).host).toEqual('core:3000');
        });

        it('should be the identity when both bases are the same', () => {
            const rewrite = createBaseURLRewriter('https://idp.example.com/', 'https://idp.example.com');

            expect(rewrite('https://idp.example.com/a/../b')).toEqual('https://idp.example.com/a/../b');
        });

        it('should never apply twice when the bases share an origin', () => {
            const rewrite = createBaseURLRewriter('http://127.0.0.1:1', 'http://127.0.0.1:41234');

            const once = rewrite('http://127.0.0.1:1/users');

            expect(once).toEqual('http://127.0.0.1:41234/users');
            expect(rewrite(once)).toEqual(once);
        });
    });

    describe('createRebasedTransport', () => {
        const PAIRS : [string, string][] = [
            ['https://idp.example.com', 'http://127.0.0.1:3000'],
            ['https://idp.example.com/', 'http://127.0.0.1:3000/'],
            ['https://idp.example.com/auth', 'http://core:3000'],
            ['https://idp.example.com/auth/', 'http://proxy/strip/'],
            ['https://idp.example.com', 'https://idp.example.com'],
            ['https://IDP.example.com:443/auth', 'http://[fd00::1]:3000'],
            ['http://[2001:db8::1]:8080', 'http://[fd00::1]:3000/internal'],
            ['http://127.0.0.1:1', 'http://127.0.0.1:41234'],
        ];

        async function record(client: Client) {
            const calls : (() => Promise<unknown>)[] = [
                () => client.status.get(),
                () => client.authorize.getInfo('?client_id=a&redirect_uri=https%3A%2F%2Fapp%2Fcb'),
                () => client.identityProvider.getMany({ filters: { realmId: 'x' } }),
                () => client.realm.getOne('..'),
                () => client.realm.getOne('../../evil'),
                () => client.userInfo.get('Bearer token'),
                () => client.token.introspect({ token: 'token' }),
                () => client.token.createWithRefreshToken({ refresh_token: 'token' }),
                () => client.token.revoke({ token: 'token' }),
            ];

            for (const call of calls) {
                try {
                    await call();
                } catch {
                    // the empty response does not decode for every call
                }
            }
        }

        it.each(PAIRS)('should dispatch %s exactly like a client based on %s', async (publicURL, internalURL) => {
            const before = new MemoryTransport({ fetch: () => ({ status: 200, body: {} }) });

            await record(new Client({ baseURL: internalURL, transport: before }));

            const after = new MemoryTransport({ fetch: () => ({ status: 200, body: {} }) });

            await record(new Client({
                baseURL: publicURL,
                transport: createRebasedTransport(publicURL, internalURL, after),
            }));

            expect(after.requests.length).toEqual(before.requests.length);
            expect(after.requests.length).toBeGreaterThan(0);

            const normalize = (url: string) => new URL(url).href;

            expect(after.requests.map((request) => normalize(request.url)))
                .toEqual(before.requests.map((request) => normalize(request.url)));
        });

        it('should keep every derived url public while dialing the internal address', async () => {
            const publicURL = 'https://idp.example.com/auth';
            const transport = new MemoryTransport({ fetch: () => ({ status: 200, body: {} }) });
            const client = new Client({
                baseURL: publicURL,
                transport: createRebasedTransport(publicURL, 'http://127.0.0.1:3000', transport),
            });

            expect(client.getBaseURL()).toEqual(publicURL);
            expect(client.identityProvider.getAuthorizeUri(PROVIDER_ID, { userCode: 'BCDFGHJK' }))
                .toEqual(`${publicURL}/identity-providers/${PROVIDER_ID}/authorize-out?user_code=BCDFGHJK`);

            await client.status.get();
            await client.token.introspect({ token: 'token' }).catch(() => undefined);

            expect(transport.requests.length).toEqual(2);

            for (const request of transport.requests) {
                expect(request.url.startsWith('http://127.0.0.1:3000/')).toBe(true);
            }
        });
    });
});
