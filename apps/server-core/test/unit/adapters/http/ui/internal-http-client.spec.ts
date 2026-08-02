/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import {
    createInternalUIHttpClient,
    createPublicToInternalURLRewriter,
} from '../../../../../src/adapters/http/ui/auth-console/http-client.ts';

describe('createPublicToInternalURLRewriter', () => {
    it('rewrites urls under a prefixed public url onto the internal address', () => {
        const rewrite = createPublicToInternalURLRewriter(
            'https://hub.local/auth',
            'http://localhost:3010/',
        );

        expect(rewrite('https://hub.local/auth/identity-providers?filter%5Benabled%5D=true'))
            .toEqual('http://localhost:3010/identity-providers?filter%5Benabled%5D=true');
    });

    it('rewrites the bare prefix to the internal root', () => {
        const rewrite = createPublicToInternalURLRewriter(
            'https://hub.local/auth',
            'http://localhost:3010/',
        );

        expect(rewrite('https://hub.local/auth')).toEqual('http://localhost:3010/');
    });

    it('rewrites urls under a prefix-less public url', () => {
        const rewrite = createPublicToInternalURLRewriter(
            'https://auth.example.com',
            'http://localhost:3010/',
        );

        expect(rewrite('https://auth.example.com/token')).toEqual('http://localhost:3010/token');
    });

    it('normalizes a trailing slash on the public url', () => {
        const rewrite = createPublicToInternalURLRewriter(
            'https://hub.local/auth/',
            'http://localhost:3010/',
        );

        expect(rewrite('https://hub.local/auth/realms')).toEqual('http://localhost:3010/realms');
    });

    it('leaves urls with a foreign origin untouched', () => {
        const rewrite = createPublicToInternalURLRewriter(
            'https://hub.local/auth',
            'http://localhost:3010/',
        );

        expect(rewrite('https://idp.example.com/oauth2/authorize'))
            .toEqual('https://idp.example.com/oauth2/authorize');
    });

    it('leaves same-origin urls outside the prefix untouched', () => {
        const rewrite = createPublicToInternalURLRewriter(
            'https://hub.local/auth',
            'http://localhost:3010/',
        );

        expect(rewrite('https://hub.local/other/thing'))
            .toEqual('https://hub.local/other/thing');

        // prefix must match on a segment boundary
        expect(rewrite('https://hub.local/authorize'))
            .toEqual('https://hub.local/authorize');
    });

    it('normalizes a wildcard internal listen address to loopback', () => {
        const rewrite = createPublicToInternalURLRewriter(
            'https://hub.local/auth',
            'http://0.0.0.0:64331/',
        );

        expect(rewrite('https://hub.local/auth/realms')).toEqual('http://127.0.0.1:64331/realms');
    });

    it('normalizes an ipv6 wildcard internal listen address to loopback', () => {
        // WHATWG URL serializes an IPv6 hostname WITH brackets:
        // new URL('http://[::]:64331/').hostname === '[::]'
        const rewrite = createPublicToInternalURLRewriter(
            'https://hub.local/auth',
            'http://[::]:64331/',
        );

        expect(rewrite('https://hub.local/auth/realms')).toEqual('http://127.0.0.1:64331/realms');
    });

    it('leaves non-absolute input untouched', () => {
        const rewrite = createPublicToInternalURLRewriter(
            'https://hub.local/auth',
            'http://localhost:3010/',
        );

        expect(rewrite('/identity-providers')).toEqual('/identity-providers');
    });
});

describe('createInternalUIHttpClient', () => {
    it('keeps the public url as baseURL so rendered hrefs stay user-facing', () => {
        const client = createInternalUIHttpClient({
            publicURL: 'https://hub.local/auth',
            internalURL: 'http://localhost:3010/',
        });

        expect(client.getBaseURL()).toEqual('https://hub.local/auth');
        expect(client.identityProvider.getAuthorizeUri('foo')).toContain('https://hub.local/auth');
    });
});
