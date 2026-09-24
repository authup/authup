/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { resolveConsoleRuntimeConfig } from '../../../../src/core/console';

const basePathDefault = '/console/account';

describe('src/core/console', () => {
    it('should normalize injected values', () => {
        const config = resolveConsoleRuntimeConfig({
            apiUrl: 'https://auth.example.com/',
            basePath: 'console/account/',
            basePathDefault,
            origin: '',
        });

        expect(config.apiUrl).toEqual('https://auth.example.com');
        expect(config.basePath).toEqual('/console/account');
    });

    it('should derive the api url from the whole default mount only', () => {
        const origin = 'https://example.com';

        expect(resolveConsoleRuntimeConfig({ basePathDefault, origin }).apiUrl)
            .toEqual('https://example.com');
        expect(resolveConsoleRuntimeConfig({
            basePath: '/auth/console/account',
            basePathDefault,
            origin,
        }).apiUrl)
            .toEqual('https://example.com/auth');
        expect(resolveConsoleRuntimeConfig({
            basePath: '/auth/account',
            basePathDefault,
            origin,
        }).apiUrl)
            .toEqual('https://example.com');
    });

    it('should enable cookie mode only when vouched for AND same-origin', () => {
        const origin = 'https://auth.example.com';

        expect(resolveConsoleRuntimeConfig({ basePathDefault, origin }).cookieSession).toBe(false);
        expect(resolveConsoleRuntimeConfig({
            apiUrl: origin,
            basePathDefault,
            cookieSession: true,
            origin: 'https://console.example.net',
        }).cookieSession).toBe(false);
        expect(resolveConsoleRuntimeConfig({
            apiUrl: origin,
            basePathDefault,
            cookieSession: true,
            origin: '',
        }).cookieSession).toBe(false);

        const served = resolveConsoleRuntimeConfig({
            apiUrl: `${origin}/auth`,
            basePathDefault,
            cookieSession: true,
            origin,
        });
        expect(served.cookieSession).toBe(true);
        expect(served.cookiePath).toEqual('/auth');
    });

    it('should keep the root cookie path for a root or cross-origin api', () => {
        expect(resolveConsoleRuntimeConfig({
            apiUrl: 'https://auth.example.com',
            basePathDefault,
            origin: 'https://auth.example.com',
        }).cookiePath).toEqual('/');
        expect(resolveConsoleRuntimeConfig({
            apiUrl: 'https://auth.example.com/auth',
            basePathDefault,
            origin: 'https://static.example.com',
        }).cookiePath).toEqual('/');
    });
});
