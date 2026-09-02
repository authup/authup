/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { SchemaEntryInput, SchemaInput } from '@authup/server-config-kit';
import {
    buildSchemaDefaults,
    buildSchemaJSONSchema,
    isSchemaEntryInput,
    isSchemaInput,
    mergeSchemaData,
    readSchemaFromFileTree,
    resolveSchemaData,
} from '@authup/server-config-kit';
import { describe, expect, it } from 'vitest';
import {
    CORE_SCHEMA,
    EnvironmentVariable,
    SCHEMA,
    expandToOrigins,
} from '../../src';
import type { AuthupConfig } from '../../src';

type Declaration = {
    /** the dotted key of the config VALUE, e.g. `core.port` */
    key: string,
    entry: SchemaEntryInput<any, any>
};

/**
 * Every entry of the document, its sections walked through: the registry is
 * shaped like the configuration object, so a key of a section is only
 * reachable through it.
 */
function collectDeclarations<T>(
    schema: SchemaInput<T>,
    prefix = '',
    declarations: Declaration[] = [],
) : Declaration[] {
    for (const [name, entry] of Object.entries(schema as Record<string, unknown>)) {
        const key = prefix ? `${prefix}.${name}` : name;

        if (isSchemaEntryInput(entry)) {
            declarations.push({ key, entry });
            continue;
        }

        if (isSchemaInput(entry)) {
            collectDeclarations<any>(entry, key, declarations);
        }
    }

    return declarations;
}

const DECLARATIONS = collectDeclarations<AuthupConfig>(SCHEMA);

describe('SCHEMA', () => {
    /**
     * The document nests one section per service, so a key belongs to exactly
     * one of them: a name declared twice would be two locations an operator
     * has to know about, and the second would answer for the first.
     */
    it('declares every key exactly once', () => {
        const keys = DECLARATIONS.map((declaration) => declaration.key);

        expect(new Set(keys).size).toEqual(keys.length);
        expect(keys.length).toBeGreaterThan(60);
    });

    /**
     * A section fills its keys' locations in, so nothing spells a path twice
     * and no two keys claim one location. The JSON Schema builder refuses the
     * latter outright; this says so where the declarations are.
     */
    it('places every key at its own absolute path', () => {
        const paths = DECLARATIONS.map(({ key, entry }) => {
            const path = entry.path || key.split('.').pop() as string;

            expect(path).toEqual(expect.any(String));

            return path;
        });

        expect(new Set(paths).size).toEqual(paths.length);
    });


    /**
     * One enum, and the complete list: a name a schema spells without an
     * entry there fails the build, and a name left behind by a retired key
     * would otherwise read as supported.
     *
     * A variable belongs to ONE key. The names an `alt` reaches are the
     * declaring key's, so they are counted there and never here.
     */
    it('maps every environment variable name onto exactly one key', () => {
        const names : string[] = [];
        for (const { entry } of DECLARATIONS) {
            if (typeof entry.env !== 'undefined') {
                names.push(entry.env);
                expect(typeof entry.readEnv).toEqual('function');
            }
        }

        expect(new Set(names).size).toEqual(names.length);
        expect([...names].sort()).toEqual(Object.values(EnvironmentVariable).sort());
    });

    /**
     * What `alt` used to do, and what replaced it: a listener with no host of
     * its own takes the deployment-wide one, and one that names its own keeps
     * it. It settles in `resolveSchemaData` rather than during the reads,
     * because inheriting another key's VALUE means seeing what that key
     * resolved to.
     */
    it('lets every listener inherit the deployment-wide host', () => {
        const resolve = (input: Partial<AuthupConfig>) => resolveSchemaData<AuthupConfig>(
            SCHEMA,
            mergeSchemaData<AuthupConfig>(SCHEMA, buildSchemaDefaults<AuthupConfig>(SCHEMA), input),
        );

        const inherited = resolve({ defaultHost: '10.0.0.5' } as Partial<AuthupConfig>);

        for (const section of ['core', 'authConsole', 'adminConsole', 'accountConsole'] as const) {
            expect((inherited as any)[section].host).toEqual('10.0.0.5');
        }

        const named = resolve({
            defaultHost: '10.0.0.5',
            adminConsole: { host: '127.0.0.1' },
        } as Partial<AuthupConfig>);

        expect((named as any).adminConsole.host).toEqual('127.0.0.1');
        expect((named as any).core.host).toEqual('10.0.0.5');
    });

    it('reads every key at the path the document spells', () => {
        const tree = {
            publicUrl: 'https://idp.example.com',
            trustedOrigins: ['https://app.example.com'],
            theme: {
                directoryPath: '/etc/authup/theme',
                fragmentsEnabled: true,
            },
            core: { port: 4001 },
            authConsole: { url: 'https://idp.example.com/console/auth', port: 4020 },
            adminConsole: { url: 'https://idp.example.com/console/admin', enabled: false },
            accountConsole: { url: 'https://idp.example.com/console/account', enabled: false },
        };

        expect(readSchemaFromFileTree<AuthupConfig>(tree, SCHEMA)).toEqual({
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
        const defaults = buildSchemaDefaults<AuthupConfig>(SCHEMA);

        for (const { key } of DECLARATIONS) {
            if (key === 'publicUrl' || key === 'db') {
                expect(defaults).not.toHaveProperty(key);
            } else {
                expect(defaults).toHaveProperty(key);
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
        const first = buildSchemaDefaults<AuthupConfig>(SCHEMA);
        (first.trustedOrigins as string[]).push('https://evil.test');

        expect(buildSchemaDefaults<AuthupConfig>(SCHEMA).trustedOrigins).toEqual([]);
    });

    it('rejects a trusted origin that is neither an http(s) origin nor a bare host', () => {
        const { type } = SCHEMA.trustedOrigins;

        expect(type.safeParse(['hub.local', 'https://app.example.com']).success).toBe(true);
        // `**` in the authority would turn every realm's console redirect
        // allowlist into allow-any-origin.
        expect(type.safeParse(['https://**.example.com']).success).toBe(false);
        expect(type.safeParse(['ftp://example.com']).success).toBe(false);
    });

    it('rejects a mis-typed trustProxy allowlist entry', () => {
        const { type } = CORE_SCHEMA.trustProxy;

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
describe('buildSchemaJSONSchema(SCHEMA)', () => {
    const schema = buildSchemaJSONSchema(SCHEMA, { title: 'Authup configuration' });

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
            'accountConsole',
            'adminConsole',
            'authConsole',
            'core',
            'db',
            'env',
            'host',
            'publicUrl',
            'redis',
            'rootPath',
            'smtp',
            'theme',
            'trustedOrigins',
        ]);

        // a section is a way of DECLARING the document, never a part of it:
        // its keys sit at the paths their entries carry. Every key a service
        // reads now sits at the top level, so nothing wraps them.
        const properties = schema.properties as Record<string, unknown>;
        expect(properties).not.toHaveProperty('server');

        expect(resolveProperty('core.port')).toBeDefined();
        expect(resolveProperty('authConsole.port')).toBeDefined();
        expect(resolveProperty('adminConsole.path')).toBeDefined();
        expect(resolveProperty('accountConsole.host')).toBeDefined();
        expect(resolveProperty('theme.directoryPath')).toBeDefined();
    });

    it('describes every key of the document', () => {
        for (const { key, entry } of DECLARATIONS) {
            const property = resolveProperty(entry.path || key.split('.').pop() as string);

            expect(property.description).toEqual(expect.any(String));
            expect((property.description as string).length).toBeGreaterThan(0);
        }
    });

    it('carries the env name and the static default, and omits a process-derived one', () => {
        const port = resolveProperty('core.port');
        expect(port['x-authup-env']).toEqual('PORT');
        expect(port.default).toEqual(3000);

        // rootPath defaults to the cwd, which is no value to publish.
        const rootPath = resolveProperty('rootPath');
        expect(rootPath).not.toHaveProperty('default');
    });

    it('represents an enum type', () => {
        expect(resolveProperty('core.certificateSource').enum)
            .toEqual(['disabled', 'standard', 'forwarded']);
    });
});

describe('expandToOrigins', () => {
    it('expands a bare host to both schemes and keeps an explicit one', () => {
        expect(expandToOrigins('hub.local')).toEqual(['http://hub.local', 'https://hub.local']);
        expect(expandToOrigins('https://hub.local')).toEqual(['https://hub.local']);
    });
});
