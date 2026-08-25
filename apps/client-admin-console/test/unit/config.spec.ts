/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { CLIENT_ADMIN_CONSOLE_NAME } from '@authup/core-kit';
import { describe, expect, it } from 'vitest';
import { resolveAdminConsoleConfig } from '../../src/config';

describe('src/config', () => {
    it('should apply injected configuration', () => {
        const config = resolveAdminConsoleConfig({
            apiUrl: 'https://auth.example.com/',
            basePath: '/admin/',
            clientId: 'my-admin-client',
            features: { adminConsole: false },
        });

        expect(config.apiUrl).toEqual('https://auth.example.com');
        expect(config.basePath).toEqual('/admin');
        expect(config.clientId).toEqual('my-admin-client');
        expect(config.enabled).toBeFalsy();
    });

    it('should default the client to the per-realm admin-console client', () => {
        const config = resolveAdminConsoleConfig({}, { origin: 'https://auth.example.com' });

        expect(config.clientId).toEqual(CLIENT_ADMIN_CONSOLE_NAME);
        expect(config.enabled).toBeTruthy();
    });

    it('should derive the api url from the base path when nothing is injected', () => {
        expect(resolveAdminConsoleConfig({}, { origin: 'https://auth.example.com' }).apiUrl)
            .toEqual('https://auth.example.com');

        // served under a sub-path: the api sits at the prefix
        expect(resolveAdminConsoleConfig({ basePath: '/auth/admin' }, { origin: 'https://example.com' }).apiUrl)
            .toEqual('https://example.com/auth');
    });

    // Cookie mode needs BOTH: the server vouching for the routes (injected)
    // and this document being able to present the credential (same-origin).
    it('should enable cookie mode only when vouched for AND same-origin', () => {
        expect(resolveAdminConsoleConfig({}, { origin: 'https://auth.example.com' }).cookieSession)
            .toBe(false);

        // capability only: a foreign API, every request would be cross-site
        expect(resolveAdminConsoleConfig({
            cookieSession: true,
            apiUrl: 'https://auth.example.com',
        }, { origin: 'https://console.example.net' }).cookieSession)
            .toBe(false);

        // applicability only: nothing vouched for the routes
        expect(resolveAdminConsoleConfig({ apiUrl: 'https://auth.example.com' }, { origin: 'https://auth.example.com' }).cookieSession)
            .toBe(false);

        // both, including a same-origin sub-path deployment
        const served = resolveAdminConsoleConfig({
            cookieSession: true,
            apiUrl: 'https://auth.example.com/auth',
        }, { origin: 'https://auth.example.com' });

        expect(served.cookieSession).toBe(true);
        expect(served.cookiePath).toEqual('/auth');

        // no origin to compare against: fail closed
        expect(resolveAdminConsoleConfig({
            cookieSession: true,
            apiUrl: 'https://auth.example.com',
        }, { origin: '' }).cookieSession)
            .toBe(false);
    });

    it('should scope the kit cookies to the root on a foreign api', () => {
        const config = resolveAdminConsoleConfig(
            { apiUrl: 'https://auth.example.com/auth' },
            { origin: 'https://console.example.net' },
        );

        expect(config.cookiePath).toEqual('/');
    });
});
