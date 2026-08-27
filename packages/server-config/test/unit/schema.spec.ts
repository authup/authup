/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { buildSchemaDefaults, readSchemaFromFileTree } from '@authup/server-config-kit';
import { describe, expect, it } from 'vitest';
import {
    ACCOUNT_CONSOLE_SECTION_CONFIG_SCHEMA,
    ADMIN_CONSOLE_SECTION_CONFIG_SCHEMA,
    AUTH_CONSOLE_SECTION_CONFIG_SCHEMA,
    CONFIG_SCHEMA,
    CORE_CONFIG_SCHEMA,
    ConfigEnvironmentVariableName,
    DEPLOYMENT_CONFIG_SCHEMA,
    THEME_CONFIG_SCHEMA,
    expandToOrigins,
} from '../../src';
import type { AuthupConfig } from '../../src';

const SECTIONS = {
    deployment: DEPLOYMENT_CONFIG_SCHEMA,
    theme: THEME_CONFIG_SCHEMA,
    core: CORE_CONFIG_SCHEMA,
    authConsole: AUTH_CONSOLE_SECTION_CONFIG_SCHEMA,
    adminConsole: ADMIN_CONSOLE_SECTION_CONFIG_SCHEMA,
    accountConsole: ACCOUNT_CONSOLE_SECTION_CONFIG_SCHEMA,
} as Record<string, Record<string, { path?: string, env?: string }>>;

const KEYS = Object.keys(CONFIG_SCHEMA) as (keyof AuthupConfig)[];

describe('CONFIG_SCHEMA', () => {
    /**
     * The document is a plain merge of the six sections, so a key declared in
     * two of them would silently lose one declaration to the other.
     */
    it('declares every key exactly once', () => {
        const declared : string[] = [];
        for (const section of Object.values(SECTIONS)) {
            declared.push(...Object.keys(section));
        }

        expect(declared.length).toEqual(KEYS.length);
        expect(new Set(declared).size).toEqual(declared.length);
    });

    /**
     * A merge of six sections has no single reading prefix left, so every
     * entry has to spell its own absolute location, and two keys may not
     * claim the same one.
     */
    it('places every key at its own absolute path', () => {
        const paths = KEYS.map((key) => CONFIG_SCHEMA[key].path);

        expect(paths.filter((path) => typeof path === 'undefined')).toEqual([]);
        expect(new Set(paths).size).toEqual(paths.length);
    });

    /**
     * One enum, and the complete list: a name a schema spells without an
     * entry there fails the build, and a name left behind by a retired key
     * would otherwise read as supported.
     */
    it('maps every environment variable name onto exactly one key', () => {
        const names : string[] = [];
        for (const key of KEYS) {
            const entry = CONFIG_SCHEMA[key];
            if (typeof entry.env !== 'undefined') {
                names.push(entry.env);
                expect(typeof entry.readEnv).toEqual('function');
            }
        }

        expect(new Set(names).size).toEqual(names.length);
        expect([...names].sort()).toEqual(Object.values(ConfigEnvironmentVariableName).sort());
    });

    it('reads every key at the path the document spells', () => {
        const tree = {
            publicUrl: 'https://idp.example.com',
            trustedOrigins: ['https://app.example.com'],
            theme: {
                directoryPath: '/etc/authup/theme',
                fragmentsEnabled: true,
            },
            server: {
                core: { port: 4001 },
                authConsole: { url: 'https://idp.example.com/console/auth', port: 4020 },
                adminConsole: { url: 'https://idp.example.com/console/admin', enabled: false },
                accountConsole: { url: 'https://idp.example.com/console/account', enabled: false },
            },
        };

        expect(readSchemaFromFileTree<AuthupConfig>(tree, CONFIG_SCHEMA)).toEqual({
            publicUrl: 'https://idp.example.com',
            trustedOrigins: ['https://app.example.com'],
            themeDirectoryPath: '/etc/authup/theme',
            themeFragmentsEnabled: true,
            port: 4001,
            authConsoleUrl: 'https://idp.example.com/console/auth',
            authConsolePort: 4020,
            adminConsoleUrl: 'https://idp.example.com/console/admin',
            accountConsoleUrl: 'https://idp.example.com/console/account',
            adminConsoleEnabled: false,
            accountConsoleEnabled: false,
        });
    });

    /**
     * `publicUrl` is derived from a listener's host and port, and `db` falls
     * back to typeorm-extension's driver default; every other key has to
     * carry a value a service can start on.
     */
    it('defaults every key but the derived ones', () => {
        const defaults = buildSchemaDefaults<AuthupConfig>(CONFIG_SCHEMA);

        for (const key of KEYS) {
            if (key === 'publicUrl' || key === 'db') {
                expect(defaults).not.toHaveProperty(key);
            } else {
                expect(defaults).toHaveProperty(key);
                expect(defaults[key]).not.toBeUndefined();
            }
        }

        expect(defaults.env).toEqual(expect.any(String));
        expect(defaults.rootPath).toEqual(process.cwd());
        expect(defaults.trustedOrigins).toEqual([]);
        expect(defaults.adminConsoleEnabled).toEqual(true);
        expect(defaults.authConsoleUrl).toEqual('');
    });

    /**
     * The array default is one literal shared by every reader, so a caller
     * mutating what it got back must not reach the next one.
     */
    it('hands out a fresh array per call', () => {
        const first = buildSchemaDefaults<AuthupConfig>(CONFIG_SCHEMA);
        (first.trustedOrigins as string[]).push('https://evil.test');

        expect(buildSchemaDefaults<AuthupConfig>(CONFIG_SCHEMA).trustedOrigins).toEqual([]);
    });

    it('rejects a trusted origin that is neither an http(s) origin nor a bare host', () => {
        const { type } = CONFIG_SCHEMA.trustedOrigins;

        expect(type.safeParse(['hub.local', 'https://app.example.com']).success).toBe(true);
        // `**` in the authority would turn every realm's console redirect
        // allowlist into allow-any-origin.
        expect(type.safeParse(['https://**.example.com']).success).toBe(false);
        expect(type.safeParse(['ftp://example.com']).success).toBe(false);
    });

    it('rejects a mis-typed trustProxy allowlist entry', () => {
        const { type } = CONFIG_SCHEMA.trustProxy;

        expect(type.safeParse(['10.0.0.0/8', 'loopback']).success).toBe(true);
        // proxy-addr would compile '1' to the address 0.0.0.1
        expect(type.safeParse(['1']).success).toBe(false);
        expect(type.safeParse(['true']).success).toBe(false);
        expect(type.safeParse(['']).success).toBe(false);
    });
});

describe('expandToOrigins', () => {
    it('expands a bare host to both schemes and keeps an explicit one', () => {
        expect(expandToOrigins('hub.local')).toEqual(['http://hub.local', 'https://hub.local']);
        expect(expandToOrigins('https://hub.local')).toEqual(['https://hub.local']);
    });
});
