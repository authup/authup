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
    // read by the publicUrl derivation, so a case that sets them must not
    // leak into the next one
    'SECRETS_ENCRYPTION_KEY',
    'MFA_REQUIRED',
    'LOGIN_ATTEMPT_THROTTLE_ENABLED',
    'EVENT_LOG_ENABLED',
    'HOST',
    'PORT',
];

describe('readAdminConsoleConfigFromEnv', () => {
    afterEach(() => {
        for (const key of KEYS) {
            delete process.env[key];
        }
    });

    /**
     * The document is self-sufficient: with no publicUrl anywhere, this
     * service derives the same issuer server-core derives, from the same two
     * document keys, so it can stand alone. It used to refuse to start, which
     * made the same authup.yml mean different things depending on whether a
     * server-core process happened to be reading it.
     */
    it('should derive the public URL from the core listener keys', () => {
        expect(readAdminConsoleConfigFromEnv().apiUrl).toEqual('http://localhost:3000');

        process.env.HOST = '127.0.0.1';
        process.env.PORT = '4711';

        const config = readAdminConsoleConfigFromEnv();

        expect(config.apiUrl).toEqual('http://127.0.0.1:4711');
        expect(config.url).toEqual('http://127.0.0.1:4711/console/admin');
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
        process.env.ADMIN_CONSOLE_URL = 'https://example.com/console';

        expect(readAdminConsoleConfigFromEnv().url)
            .toEqual('https://example.com/console');
    });

    /**
     * A path of its own is what the key is for; a DOMAIN of its own
     * half-works rather than failing, so it fails here. server-core has
     * refused it at boot for a while, but a console started through its own
     * bin never runs that normalization and used to boot into exactly the
     * state the refusal describes.
     */
    it('should refuse a console published on another origin', () => {
        process.env.PUBLIC_URL = 'https://example.com';
        process.env.ADMIN_CONSOLE_URL = 'https://console.example.com';

        expect(() => readAdminConsoleConfigFromEnv()).toThrow(/not the origin of publicUrl/);
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
        expect(config.host).toEqual('0.0.0.0');
    });

    /**
     * A console selects two keys of `server.core` (the listener address the
     * issuer derives from), never the section. `resolveSchemaData` runs every
     * resolver in a registry, and the section carries server-core's own
     * invariants, so selecting it would make this service refuse to start over
     * a key store, an MFA flag and an event log it does not have.
     */
    it('should not inherit server-core own invariants', () => {
        const cases : Record<string, string>[] = [
            { SECRETS_ENCRYPTION_KEY: Buffer.alloc(16, 1).toString('base64') },
            { MFA_REQUIRED: 'true' },
            { LOGIN_ATTEMPT_THROTTLE_ENABLED: 'true', EVENT_LOG_ENABLED: 'false' },
        ];

        for (const env of cases) {
            process.env.PUBLIC_URL = 'https://example.com';
            Object.assign(process.env, env);

            try {
                expect(() => readAdminConsoleConfigFromEnv()).not.toThrow();
            } finally {
                for (const key of Object.keys(env)) {
                    delete process.env[key];
                }
            }
        }
    });
});
