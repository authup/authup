/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { buildSchemaDefaults, readSchemaFromFileTree } from '@authup/server-config-kit';
import { describe, expect, it } from 'vitest';
import { BASE_CONFIG_SCHEMA, expandToOrigins } from '../../src';
import type { BaseConfig } from '../../src';

describe('BASE_CONFIG_SCHEMA', () => {
    it('reads every key at the path the document spells', () => {
        const tree = {
            publicUrl: 'https://idp.example.com',
            trustedOrigins: ['https://app.example.com'],
            theme: {
                directoryPath: '/etc/authup/theme',
                fragmentsEnabled: true,
            },
            server: {
                authConsole: { url: 'https://idp.example.com/console/auth' },
                adminConsole: { url: 'https://idp.example.com/console/admin', enabled: false },
                accountConsole: { url: 'https://idp.example.com/console/account', enabled: false },
            },
        };

        expect(readSchemaFromFileTree<BaseConfig>(tree, BASE_CONFIG_SCHEMA)).toEqual({
            publicUrl: 'https://idp.example.com',
            trustedOrigins: ['https://app.example.com'],
            themeDirectoryPath: '/etc/authup/theme',
            themeFragmentsEnabled: true,
            authConsoleUrl: 'https://idp.example.com/console/auth',
            adminConsoleUrl: 'https://idp.example.com/console/admin',
            accountConsoleUrl: 'https://idp.example.com/console/account',
            adminConsoleEnabled: false,
            accountConsoleEnabled: false,
        });
    });

    /**
     * `publicUrl` is the one key nothing here can default: server-core
     * derives it from its own host and port, and a console has no host and
     * port of the API's to derive it from.
     */
    it('defaults every key but the derived one', () => {
        const defaults = buildSchemaDefaults<BaseConfig>(BASE_CONFIG_SCHEMA);

        expect(defaults).not.toHaveProperty('publicUrl');
        expect(defaults.trustedOrigins).toEqual([]);
        expect(defaults.adminConsoleEnabled).toEqual(true);
        expect(defaults.authConsoleUrl).toEqual('');
    });

    /**
     * The array default is one literal shared by every reader, so a caller
     * mutating what it got back must not reach the next one.
     */
    it('hands out a fresh array per call', () => {
        const first = buildSchemaDefaults<BaseConfig>(BASE_CONFIG_SCHEMA);
        (first.trustedOrigins as string[]).push('https://evil.test');

        expect(buildSchemaDefaults<BaseConfig>(BASE_CONFIG_SCHEMA).trustedOrigins).toEqual([]);
    });

    it('rejects a trusted origin that is neither an http(s) origin nor a bare host', () => {
        const { type } = BASE_CONFIG_SCHEMA.trustedOrigins;

        expect(type.safeParse(['hub.local', 'https://app.example.com']).success).toBe(true);
        // `**` in the authority would turn every realm's console redirect
        // allowlist into allow-any-origin.
        expect(type.safeParse(['https://**.example.com']).success).toBe(false);
        expect(type.safeParse(['ftp://example.com']).success).toBe(false);
    });
});

describe('expandToOrigins', () => {
    it('expands a bare host to both schemes and keeps an explicit one', () => {
        expect(expandToOrigins('hub.local')).toEqual(['http://hub.local', 'https://hub.local']);
        expect(expandToOrigins('https://hub.local')).toEqual(['https://hub.local']);
    });
});
