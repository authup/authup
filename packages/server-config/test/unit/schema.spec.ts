/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    buildSchemaDefaults,
    buildSchemaJSONSchema,
    readSchemaFromFileTree,
    resolveSchemaEnvNames,
} from '@authup/server-config-kit';
import { describe, expect, it } from 'vitest';
import {
    ACCOUNT_CONSOLE_CONFIG_SCHEMA,
    ADMIN_CONSOLE_CONFIG_SCHEMA,
    AUTH_CONSOLE_CONFIG_SCHEMA,
    CONFIG_SCHEMA,
    CORE_CONFIG_SCHEMA,
    EnvironmentVariable,
    ROOT_CONFIG_SCHEMA,
    THEME_CONFIG_SCHEMA,
    expandToOrigins,
} from '../../src';
import type { AuthupConfig } from '../../src';

/**
 * The DOCUMENT projection of every section: a section declares its keys the
 * way it names them (`host`, not `adminConsoleHost`), and the merge below is
 * what qualifies them.
 */
const SECTIONS = {
    root: ROOT_CONFIG_SCHEMA,
    theme: THEME_CONFIG_SCHEMA,
    core: CORE_CONFIG_SCHEMA,
    authConsole: AUTH_CONSOLE_CONFIG_SCHEMA,
    adminConsole: ADMIN_CONSOLE_CONFIG_SCHEMA,
    accountConsole: ACCOUNT_CONSOLE_CONFIG_SCHEMA,
} as Record<string, Record<string, { path?: string | string[], env?: string | string[] }>>;

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
     * One enum, and the complete list: a name a schema spells without an
     * entry there fails the build, and a name left behind by a retired key
     * would otherwise read as supported.
     */
    it('maps every environment variable name onto exactly one key', () => {
        const names : string[] = [];
        for (const key of KEYS) {
            const entry = CONFIG_SCHEMA[key];
            const [name, ...fallbacks] = resolveSchemaEnvNames(entry);

            if (typeof name !== 'undefined') {
                names.push(name);
                expect(typeof entry.readEnv).toEqual('function');
            }

            // a chain borrows another key's variable, so it may not introduce
            // a name of its own: HOST means one thing in this document.
            for (const fallback of fallbacks) {
                expect(names.concat(
                    KEYS.map((other) => resolveSchemaEnvNames(CONFIG_SCHEMA[other])[0]),
                )).toContain(fallback);
            }
        }

        expect(new Set(names).size).toEqual(names.length);
        expect([...names].sort()).toEqual(Object.values(EnvironmentVariable).sort());
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
            theme: {
                directoryPath: '/etc/authup/theme',
                fragmentsEnabled: true,
            },
            core: { port: 4001 },
            authConsole: {
                url: 'https://idp.example.com/console/auth',
                port: 4020,
            },
            adminConsole: {
                url: 'https://idp.example.com/console/admin',
                enabled: false,
            },
            accountConsole: {
                url: 'https://idp.example.com/console/account',
                enabled: false,
            },
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
        expect(defaults.adminConsole?.enabled).toEqual(true);
        expect(defaults.authConsole?.url).toEqual('');
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

/**
 * The document `authup config schema` prints, which the docs workflow
 * publishes at the URL an `authup.yml` names in its
 * `# yaml-language-server: $schema=` line. Nothing is committed any more, so
 * this is the only place its shape is pinned.
 */
describe('buildSchemaJSONSchema(CONFIG_SCHEMA)', () => {
    const schema = buildSchemaJSONSchema(CONFIG_SCHEMA, { title: 'Authup configuration' });

    function resolveProperty(path: string) {
        let node = schema as Record<string, any>;

        for (const segment of path.split('.')) {
            expect(node.properties).toBeDefined();
            node = node.properties[segment];
            expect(node).toBeDefined();
        }

        return node as Record<string, unknown>;
    }

    it('emits a draft-07 object schema carrying the title', () => {
        expect(schema.$schema).toEqual('http://json-schema.org/draft-07/schema#');
        expect(schema.type).toEqual('object');
        expect(schema.title).toEqual('Authup configuration');
    });

    /**
     * A section per service, and the deployment-wide keys at the root: an
     * operator writes ONE file, so the document has to describe every key,
     * including the ones only another service reads.
     */
    it('nests every key at the path its entry spells', () => {
        expect(Object.keys(schema.properties as Record<string, unknown>).sort()).toEqual([
            'db',
            'env',
            'publicUrl',
            'redis',
            'rootPath',
            'server',
            'smtp',
            'theme',
            'trustedOrigins',
        ]);

        expect(resolveProperty('server.core.port')).toBeDefined();
        expect(resolveProperty('server.authConsole.port')).toBeDefined();
        expect(resolveProperty('server.adminConsole.path')).toBeDefined();
        expect(resolveProperty('server.accountConsole.host')).toBeDefined();
        expect(resolveProperty('theme.directoryPath')).toBeDefined();
    });

    it('describes every key of the document', () => {
        for (const key of KEYS) {
            const property = resolveProperty(CONFIG_SCHEMA[key].path as string);

            expect(property.description).toEqual(expect.any(String));
            expect((property.description as string).length).toBeGreaterThan(0);
        }
    });

    it('carries the env name and the static default, and omits a process-derived one', () => {
        const port = resolveProperty('server.core.port');
        expect(port['x-authup-env']).toEqual('PORT');
        expect(port.default).toEqual(3001);

        // rootPath defaults to the cwd, which is no value to publish.
        const rootPath = resolveProperty('rootPath');
        expect(rootPath).not.toHaveProperty('default');
    });

    it('represents an enum type', () => {
        expect(resolveProperty('server.core.certificateSource').enum)
            .toEqual(['disabled', 'standard', 'forwarded']);
    });
});

describe('expandToOrigins', () => {
    it('expands a bare host to both schemes and keeps an explicit one', () => {
        expect(expandToOrigins('hub.local')).toEqual(['http://hub.local', 'https://hub.local']);
        expect(expandToOrigins('https://hub.local')).toEqual(['https://hub.local']);
    });
});
