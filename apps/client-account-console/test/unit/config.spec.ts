/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { resolveAccountConsoleConfig } from '../../src/config';

describe('src/config', () => {
    it('should apply injected configuration', () => {
        const config = resolveAccountConsoleConfig({
            apiUrl: 'https://auth.example.com/',
            basePath: '/account/',
            features: { accountConsole: false },
        });

        expect(config.apiUrl).toEqual('https://auth.example.com');
        expect(config.basePath).toEqual('/account');
        expect(config.enabled).toBeFalsy();
    });

    // Cookie mode is DERIVED, never injected: it is usable exactly when the
    // API is this console's own origin, because the credential is
    // SameSite=Strict and the server demands Sec-Fetch-Site: same-origin.
    // Deriving it is what makes `${apiUrl}/account/login` sound in kick().
    it('should enable cookie mode only when the api is this origin', () => {
        // embedded serving: apiUrl derived from the origin
        expect(resolveAccountConsoleConfig({}, { origin: 'https://auth.example.com' }).cookieSession)
            .toBe(true);

        // same origin, explicit apiUrl, sub-path deployment
        const served = resolveAccountConsoleConfig({ apiUrl: 'https://auth.example.com/auth' }, { origin: 'https://auth.example.com' });

        expect(served.cookieSession).toBe(true);
        expect(served.cookiePath).toEqual('/auth');

        // a standalone host on a foreign origin could never present the
        // SameSite=Strict credential, and its requests would all be
        // cross-site, so it stays on the client-side code flow
        const standalone = resolveAccountConsoleConfig({ apiUrl: 'https://auth.example.com' }, { origin: 'https://console.example.net' });

        expect(standalone.cookieSession).toBe(false);
        expect(standalone.cookiePath).toEqual('/');

        // no origin to compare against (SSR, a test harness): fail closed
        expect(resolveAccountConsoleConfig({ apiUrl: 'https://auth.example.com' }, { origin: '' }).cookieSession)
            .toBe(false);
    });

    it('should derive the api url from the base path (embedded serving)', () => {
        const config = resolveAccountConsoleConfig({}, { origin: 'https://auth.example.com' });

        expect(config.apiUrl).toEqual('https://auth.example.com');
        expect(config.basePath).toEqual('/account');
        expect(config.enabled).toBeTruthy();
    });

    it('should keep a sub-path prefix in the derived api url', () => {
        const config = resolveAccountConsoleConfig(
            { basePath: '/auth/account' },
            { origin: 'https://example.com' },
        );

        expect(config.apiUrl).toEqual('https://example.com/auth');
        expect(config.basePath).toEqual('/auth/account');
    });

    it('should not derive a prefix from a foreign base path', () => {
        const config = resolveAccountConsoleConfig(
            { basePath: '/self-service' },
            { origin: 'https://example.com' },
        );

        expect(config.apiUrl).toEqual('https://example.com');
        expect(config.basePath).toEqual('/self-service');
    });

    // The session cookies are shared with the hosted auth pages, so their
    // scope is the sub-path authup is served under — never the root of an
    // origin a host application may occupy with the same cookie names.
    it('should scope the cookie path to a same-origin sub-path deployment', () => {
        const config = resolveAccountConsoleConfig(
            {
                apiUrl: 'https://app.example.com/auth',
                basePath: '/auth/account',
            },
            { origin: 'https://app.example.com' },
        );

        expect(config.cookiePath).toEqual('/auth');
    });

    it('should keep the root cookie path for a root deployment', () => {
        const config = resolveAccountConsoleConfig(
            { apiUrl: 'https://auth.example.com' },
            { origin: 'https://auth.example.com' },
        );

        expect(config.cookiePath).toEqual('/');
    });

    it('should keep the root cookie path for a cross-origin api url', () => {
        const config = resolveAccountConsoleConfig(
            { apiUrl: 'https://auth.example.com/auth' },
            { origin: 'https://static.example.com' },
        );

        expect(config.cookiePath).toEqual('/');
    });

    it('should derive the cookie path alongside a derived api url', () => {
        const config = resolveAccountConsoleConfig(
            { basePath: '/auth/account' },
            { origin: 'https://app.example.com' },
        );

        expect(config.apiUrl).toEqual('https://app.example.com/auth');
        expect(config.cookiePath).toEqual('/auth');
    });
});
