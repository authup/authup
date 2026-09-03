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
import { readConfigFromEnv } from '../../src';

const KEYS = [
    'PUBLIC_URL',
    'ACCOUNT_CONSOLE_URL',
    'ACCOUNT_CONSOLE_PORT',
    'ACCOUNT_CONSOLE_HOST',
    'ACCOUNT_CONSOLE_ENABLED',
    'ACCOUNT_CONSOLE_PATH',
    'TRUSTED_ORIGINS',
    // read by the publicUrl derivation, so a case that sets them must not
    // leak into the next one
    'HOST',
    'PORT',
];

describe('readConfigFromEnv', () => {
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
        expect(readConfigFromEnv().apiUrl).toEqual('http://localhost:3000');

        process.env.HOST = '127.0.0.1';
        process.env.PORT = '4711';

        const config = readConfigFromEnv();

        expect(config.apiUrl).toEqual('http://127.0.0.1:4711');
        expect(config.url).toEqual('http://127.0.0.1:4711/console/account');
    });

    it('should derive the console URL from the public URL', () => {
        process.env.PUBLIC_URL = 'https://example.com';

        const config = readConfigFromEnv();

        expect(config.url).toEqual('https://example.com/console/account');
        expect(config.apiUrl).toEqual('https://example.com');
    });

    it('should derive the console URL from a public URL carrying a sub-path', () => {
        process.env.PUBLIC_URL = 'https://example.com/auth/';

        expect(readConfigFromEnv().url)
            .toEqual('https://example.com/auth/console/account');
    });

    it('should prefer an explicit console URL', () => {
        process.env.PUBLIC_URL = 'https://example.com';
        process.env.ACCOUNT_CONSOLE_URL = 'https://example.com/account';

        expect(readConfigFromEnv().url)
            .toEqual('https://example.com/account');
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
        process.env.ACCOUNT_CONSOLE_URL = 'https://account.example.com';

        expect(() => readConfigFromEnv()).toThrow(/not the origin of publicUrl/);
    });

    it('should read the disabled flag as a boolean', () => {
        process.env.PUBLIC_URL = 'https://example.com';
        process.env.ACCOUNT_CONSOLE_ENABLED = 'false';

        expect(readConfigFromEnv().enabled).toEqual(false);
    });

    it('should read the listen address as a number and a string', () => {
        process.env.PUBLIC_URL = 'https://example.com';
        process.env.ACCOUNT_CONSOLE_PORT = '4022';
        process.env.ACCOUNT_CONSOLE_HOST = '127.0.0.1';

        const config = readConfigFromEnv();

        expect(config.port).toEqual(4022);
        expect(config.host).toEqual('127.0.0.1');
    });

    it('should fall back to the default listen address', () => {
        process.env.PUBLIC_URL = 'https://example.com';

        const config = readConfigFromEnv();

        expect(config.port).toEqual(3022);
        expect(config.host).toEqual('0.0.0.0');
    });

    it('should read the trusted origins as a list', () => {
        process.env.PUBLIC_URL = 'https://example.com';
        process.env.TRUSTED_ORIGINS = 'https://admin.example.com,https://hub.example.com';

        // canonicalized and dev-seeded by the key's own resolver, so this
        // service gets the same list server-core does without being handed one
        expect(readConfigFromEnv().trustedOrigins).toEqual([
            'https://admin.example.com',
            'https://hub.example.com',
            'http://localhost:5173',
        ]);
    });

    /**
     * A scheme-less entry is a supported short form. Taken verbatim it becomes
     * the pattern `hub.local/**`, matched against an absolute URL, which
     * matches nothing: the `ref` back link would then disappear for exactly
     * the origins written in the short form, with no diagnostic.
     */
    it('should expand a bare host to both of its origins', () => {
        process.env.PUBLIC_URL = 'https://example.com';
        process.env.NODE_ENV = 'production';
        process.env.TRUSTED_ORIGINS = 'hub.local';

        expect(readConfigFromEnv().trustedOrigins)
            .toEqual(['http://hub.local', 'https://hub.local']);

        delete process.env.NODE_ENV;
    });
});
