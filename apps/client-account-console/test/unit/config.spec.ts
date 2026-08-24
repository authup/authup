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

    // Cookie mode is a property of how the bundle is served (server-core
    // injects it), never an operator choice — and never a default: a
    // standalone host on a foreign origin could not present the
    // SameSite=Strict credential and must stay on the client-side code flow.
    it('should keep the token flow unless cookie mode is injected', () => {
        expect(resolveAccountConsoleConfig({}, { origin: 'https://auth.example.com' }).cookieSession)
            .toBe(false);
        expect(resolveAccountConsoleConfig({ cookieSession: true }, { origin: 'https://auth.example.com' }).cookieSession)
            .toBe(true);
    });

    it('should refuse cookie mode when the api is on another origin', () => {
        // The comment above states the rule; this is the case that enforces
        // it. `cookieSession` is a public field of the injected config, so a
        // standalone host CAN set it while pointing `apiUrl` elsewhere. That
        // combination cannot work and does not announce itself: the kick
        // redirects, the callback sets a SameSite=Strict cookie on the API's
        // origin, and every request from this console is then cross-site and
        // refused, so the console loops back to sign-in with no diagnostic.
        expect(resolveAccountConsoleConfig({
            cookieSession: true,
            apiUrl: 'https://auth.example.com',
        }, { origin: 'https://console.example.net' }).cookieSession)
            .toBe(false);

        // ... and the same deployment keeps a root cookie scope, since the
        // console's own origin owns nothing worth scoping.
        expect(resolveAccountConsoleConfig({
            cookieSession: true,
            apiUrl: 'https://auth.example.com/auth',
        }, { origin: 'https://console.example.net' }).cookiePath)
            .toEqual('/');

        // A same-origin sub-path deployment is the case that must still work:
        // it is what server-core serves.
        const served = resolveAccountConsoleConfig({
            cookieSession: true,
            apiUrl: 'https://auth.example.com/auth',
        }, { origin: 'https://auth.example.com' });

        expect(served.cookieSession).toBe(true);
        expect(served.cookiePath).toEqual('/auth');
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
