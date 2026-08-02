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
});
