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
import { readAdminConsoleConfigFromEnv } from '../../src';

const KEYS = [
    'PUBLIC_URL',
    'ADMIN_CONSOLE_URL',
    'ADMIN_CONSOLE_PORT',
    'ADMIN_CONSOLE_HOST',
    'ADMIN_CONSOLE_ENABLED',
    'ADMIN_CONSOLE_PATH',
];

describe('readAdminConsoleConfigFromEnv', () => {
    afterEach(() => {
        for (const key of KEYS) {
            delete process.env[key];
        }
    });

    it('should refuse to start without the public URL', () => {
        expect(() => readAdminConsoleConfigFromEnv()).toThrow(/PUBLIC_URL/);
    });

    it('should derive the console URL from the public URL', () => {
        process.env.PUBLIC_URL = 'https://example.com';

        const config = readAdminConsoleConfigFromEnv();

        expect(config.url).toEqual('https://example.com/console/admin');
        expect(config.apiUrl).toEqual('https://example.com');
    });

    it('should derive the console URL from a public URL carrying a sub-path', () => {
        process.env.PUBLIC_URL = 'https://example.com/auth/';

        expect(readAdminConsoleConfigFromEnv().url)
            .toEqual('https://example.com/auth/console/admin');
    });

    it('should prefer an explicit console URL', () => {
        process.env.PUBLIC_URL = 'https://example.com';
        process.env.ADMIN_CONSOLE_URL = 'https://console.example.com';

        expect(readAdminConsoleConfigFromEnv().url)
            .toEqual('https://console.example.com');
    });

    it('should read the disabled flag as a boolean', () => {
        process.env.PUBLIC_URL = 'https://example.com';
        process.env.ADMIN_CONSOLE_ENABLED = 'false';

        expect(readAdminConsoleConfigFromEnv().enabled).toEqual(false);
    });

    it('should read the listen address as a number and a string', () => {
        process.env.PUBLIC_URL = 'https://example.com';
        process.env.ADMIN_CONSOLE_PORT = '4021';
        process.env.ADMIN_CONSOLE_HOST = '127.0.0.1';

        const config = readAdminConsoleConfigFromEnv();

        expect(config.port).toEqual(4021);
        expect(config.host).toEqual('127.0.0.1');
    });

    it('should fall back to the default listen address', () => {
        process.env.PUBLIC_URL = 'https://example.com';

        const config = readAdminConsoleConfigFromEnv();

        expect(config.port).toEqual(3021);
        expect(config.host).toEqual('');
    });
});
