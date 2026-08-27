/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    afterEach,
    describe,
    expect,
    it,
} from 'vitest';
import { readAccountConsoleConfigFromEnv } from '../../src';

const KEYS = [
    'PUBLIC_URL',
    'ACCOUNT_CONSOLE_URL',
    'ACCOUNT_CONSOLE_PORT',
    'ACCOUNT_CONSOLE_HOST',
    'ACCOUNT_CONSOLE_ENABLED',
    'ACCOUNT_CONSOLE_PATH',
    'TRUSTED_ORIGINS',
];

describe('readAccountConsoleConfigFromEnv', () => {
    afterEach(() => {
        for (const key of KEYS) {
            delete process.env[key];
        }
    });

    it('should refuse to start without the public URL', () => {
        expect(() => readAccountConsoleConfigFromEnv()).toThrow(/PUBLIC_URL/);
    });

    it('should derive the console URL from the public URL', () => {
        process.env.PUBLIC_URL = 'https://example.com';

        const config = readAccountConsoleConfigFromEnv();

        expect(config.url).toEqual('https://example.com/console/account');
        expect(config.apiUrl).toEqual('https://example.com');
    });

    it('should derive the console URL from a public URL carrying a sub-path', () => {
        process.env.PUBLIC_URL = 'https://example.com/auth/';

        expect(readAccountConsoleConfigFromEnv().url)
            .toEqual('https://example.com/auth/console/account');
    });

    it('should prefer an explicit console URL', () => {
        process.env.PUBLIC_URL = 'https://example.com';
        process.env.ACCOUNT_CONSOLE_URL = 'https://account.example.com';

        expect(readAccountConsoleConfigFromEnv().url)
            .toEqual('https://account.example.com');
    });

    it('should read the disabled flag as a boolean', () => {
        process.env.PUBLIC_URL = 'https://example.com';
        process.env.ACCOUNT_CONSOLE_ENABLED = 'false';

        expect(readAccountConsoleConfigFromEnv().enabled).toEqual(false);
    });

    it('should read the listen address as a number and a string', () => {
        process.env.PUBLIC_URL = 'https://example.com';
        process.env.ACCOUNT_CONSOLE_PORT = '4022';
        process.env.ACCOUNT_CONSOLE_HOST = '127.0.0.1';

        const config = readAccountConsoleConfigFromEnv();

        expect(config.port).toEqual(4022);
        expect(config.host).toEqual('127.0.0.1');
    });

    it('should fall back to the default listen address', () => {
        process.env.PUBLIC_URL = 'https://example.com';

        const config = readAccountConsoleConfigFromEnv();

        expect(config.port).toEqual(3022);
        expect(config.host).toEqual('');
    });

    it('should read the trusted origins as a list', () => {
        process.env.PUBLIC_URL = 'https://example.com';
        process.env.TRUSTED_ORIGINS = 'https://admin.example.com,https://hub.example.com';

        expect(readAccountConsoleConfigFromEnv().trustedOrigins)
            .toEqual(['https://admin.example.com', 'https://hub.example.com']);
    });
});
