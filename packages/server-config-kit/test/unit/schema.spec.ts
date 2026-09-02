/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Container } from 'validup';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vitest';
import { z } from 'zod';
import type { SchemaInput } from '../../src';
import {
    buildSchemaDefaults,
    buildSchemaJSONSchema,
    defineSchema,
    findUnknownSchemaPaths,
    mergeSchemaData,
    mountSchema,
    readEnvBoolOrString,
    readEnvInt,
    readEnvString,
    readSchemaFromEnv,
    readSchemaFromFileTree,
    resolveSchemaData,
} from '../../src';

/**
 * The document shape every registry has: deployment-wide keys at the root,
 * and one section per service, declared in that service's own vocabulary.
 */
type Fixture = {
    publicUrl: string,
    trustedOrigins: string[],
    host: string,
    core: {
        port: number,
        host: string
    },
    adminConsole: {
        enabled: boolean,
        host: string
    }
};

const HOST = {
    type: z.string(),
    description: 'The address every listener binds.',
    default: '0.0.0.0',
    path: 'host',
    env: 'HOST',
    readEnv: readEnvString,
};

const SCHEMA : SchemaInput<Fixture> = {
    publicUrl: {
        type: z.string(),
        description: 'The public url.',
        path: 'publicUrl',
    },
    trustedOrigins: {
        type: z.array(z.string()),
        description: 'The trusted origins.',
        default: [],
        path: 'trustedOrigins',
    },
    host: HOST,
    core: defineSchema( {
        port: {
            type: z.number(),
            description: 'The port to listen on.',
            default: 3001,
            env: 'PORT',
            readEnv: readEnvInt,
        },
        host: {
            type: z.string(),
            description: 'The address this listener binds.',
            default: '',
            resolve: ({ value, get }) => (value as string) || get('host') as string,
        },
    }, { pathPrefix: 'server.core' }),
    adminConsole: defineSchema( {
        enabled: {
            type: z.boolean(),
            description: 'Serve the admin console.',
            default: true,
        },
        host: {
            type: z.string(),
            description: 'The address this listener binds.',
            default: '',
            env: 'ADMIN_CONSOLE_HOST',
            readEnv: readEnvString,
            resolve: ({ value, get }) => (value as string) || get('host') as string,
        },
    }, { pathPrefix: 'server.adminConsole' }),
};

describe('readSchemaFromFileTree', () => {
    it('should read every key at its resolved path', () => {
        const data = readSchemaFromFileTree({
            publicUrl: 'https://idp.example.com',
            trustedOrigins: ['https://app.example.com'],
            server: {
                core: { port: 3002 },
                adminConsole: { enabled: false },
            },
        }, SCHEMA);

        expect(data).toEqual({
            publicUrl: 'https://idp.example.com',
            trustedOrigins: ['https://app.example.com'],
            core: { port: 3002 },
            adminConsole: { enabled: false },
        });
    });

    /**
     * The whole point of a section: one key per listener, and the document
     * says where it lives once.
     */
    it('should read a section into a value of its own', () => {
        const data = readSchemaFromFileTree({ server: { core: { port: 4001, host: '10.0.0.1' } } }, SCHEMA);

        expect(data).toEqual({
            core: { port: 4001, host: '10.0.0.1' },
            adminConsole: {},
        });
    });

    it('should skip a key the document says nothing about', () => {
        const data = readSchemaFromFileTree({ publicUrl: 'https://idp.example.com' }, SCHEMA);

        expect(data).toEqual({
            publicUrl: 'https://idp.example.com',
            core: {},
            adminConsole: {},
        });
    });

    it('should collect a falsy value', () => {
        const data = readSchemaFromFileTree({
            publicUrl: '',
            server: { core: { port: 0 }, adminConsole: { enabled: false } },
        }, SCHEMA);

        expect(data).toEqual({
            publicUrl: '',
            core: { port: 0 },
            adminConsole: { enabled: false },
        });
    });

    it('should yield nothing for a non object tree', () => {
        expect(readSchemaFromFileTree(undefined, SCHEMA)).toEqual({});
        expect(readSchemaFromFileTree('authup.yml', SCHEMA)).toEqual({});
        expect(readSchemaFromFileTree([], SCHEMA)).toEqual({});
    });

    it('should not read an inherited value', () => {
        // the guard that matters is not the `__proto__` PATH below (that walk
        // dies on its next segment anyway), it is a key the document does not
        // carry: without an own-property check a polluted Object.prototype
        // answers for it and silently becomes the configured value.
        const schema : SchemaInput<{ port: number }> = {
            port: {
                type: z.number(),
                description: '',
                path: 'server.core.port',
            },
        };

        const prototype = Object.prototype as Record<string, unknown>;
        prototype.port = 9999;
        prototype.core = { port: 9999 };

        try {
            expect(readSchemaFromFileTree({ server: { core: {} } }, schema)).toEqual({});
            expect(readSchemaFromFileTree({ server: {} }, schema)).toEqual({});
            expect(readSchemaFromFileTree({ server: { core: { port: 1 } } }, schema)).toEqual({ port: 1 });
        } finally {
            delete prototype.port;
            delete prototype.core;
        }
    });

    it('should not descend onto the prototype', () => {
        const schema : SchemaInput<{ polluted: string, name: string }> = {
            polluted: {
                type: z.string(),
                description: '',
                path: '__proto__.polluted',
            },
            name: {
                type: z.string(),
                description: '',
                path: 'constructor.name',
            },
        };

        expect(readSchemaFromFileTree({}, schema)).toEqual({});
    });
});

describe('readSchemaFromEnv', () => {
    afterEach(() => {
        delete process.env.HOST;
        delete process.env.ADMIN_CONSOLE_HOST;
        delete process.env.PORT;
    });

    it('should read every key carrying a variable', () => {
        process.env.PORT = '4001';
        process.env.HOST = '127.0.0.1';

        // the READ fills only the keys that declare a variable of their own.
        // A listener inheriting the deployment-wide host does it in
        // `resolveSchemaData`, over merged data, not here.
        expect(readSchemaFromEnv(SCHEMA)).toEqual({
            host: '127.0.0.1',
            core: { port: 4001 },
            adminConsole: {},
        });
    });

    /**
     * What the fallback is for: the shared variable is set and the listener's
     * own is not, which is how an operator binds every listener at once. It
     * settles in `resolveSchemaData`, because inheriting another key's VALUE
     * means seeing what that key resolved to.
     */
    it('should let a listener inherit the deployment-wide host', () => {
        process.env.HOST = '127.0.0.1';

        const resolved = resolveSchemaData(
            SCHEMA,
            mergeSchemaData(SCHEMA, buildSchemaDefaults(SCHEMA), readSchemaFromEnv(SCHEMA)),
        ) as any;

        expect(resolved.core.host).toEqual('127.0.0.1');
        expect(resolved.adminConsole.host).toEqual('127.0.0.1');
    });

    it('should prefer a listener own variable over the deployment-wide one', () => {
        process.env.HOST = '127.0.0.1';
        process.env.ADMIN_CONSOLE_HOST = '10.0.0.5';

        const resolved = resolveSchemaData(
            SCHEMA,
            mergeSchemaData(SCHEMA, buildSchemaDefaults(SCHEMA), readSchemaFromEnv(SCHEMA)),
        ) as any;

        expect(resolved.core.host).toEqual('127.0.0.1');
        expect(resolved.adminConsole.host).toEqual('10.0.0.5');
    });

    it('should skip a key whose variables are all unset', () => {
        expect(readSchemaFromEnv(SCHEMA)).toEqual({ core: {}, adminConsole: {} });
    });
});

describe('buildSchemaDefaults', () => {
    it('should build a default per key, sections included', () => {
        expect(buildSchemaDefaults(SCHEMA)).toEqual({
            trustedOrigins: [],
            host: '0.0.0.0',
            core: { port: 3001, host: '' },
            adminConsole: { enabled: true, host: '' },
        });
    });
});

describe('mergeSchemaData', () => {
    /**
     * The precedence every service composes its configuration with. A plain
     * spread would let the environment's `core` object replace the file's,
     * and the file's replace the defaults, so one variable would blank every
     * other key of that listener.
     */
    it('should layer a section key by key rather than wholesale', () => {
        const defaults = buildSchemaDefaults(SCHEMA);
        const file = readSchemaFromFileTree({
            publicUrl: 'https://idp.example.com',
            server: { core: { host: '10.0.0.1' } },
        }, SCHEMA);
        const env = { core: { port: 4001 } } as Partial<Fixture>;

        expect(mergeSchemaData(SCHEMA, defaults, file, env)).toEqual({
            publicUrl: 'https://idp.example.com',
            trustedOrigins: [],
            host: '0.0.0.0',
            core: { port: 4001, host: '10.0.0.1' },
            adminConsole: { enabled: true, host: '' },
        });
    });

    it('should replace a value rather than merge into it', () => {
        const merged = mergeSchemaData(
            SCHEMA,
            { trustedOrigins: ['https://a.example.com', 'https://b.example.com'] },
            { trustedOrigins: ['https://c.example.com'] },
        );

        expect(merged.trustedOrigins).toEqual(['https://c.example.com']);
    });
});

describe('mountSchema', () => {
    it('should validate a section rather than drop it', async () => {
        const container = new Container<Record<string, any>>();
        mountSchema(container, SCHEMA as SchemaInput<Record<string, any>>);

        await expect(container.run({
            publicUrl: 'https://idp.example.com',
            core: { port: 'not-a-port' },
        })).rejects.toThrow();

        // a mounted section is also what carries the value over: validup
        // strips whatever nothing claims.
        expect(await container.run({
            publicUrl: 'https://idp.example.com',
            core: { port: 4001 },
        })).toEqual({
            publicUrl: 'https://idp.example.com',
            core: { port: 4001 },
        });
    });
});

describe('findUnknownSchemaPaths', () => {
    it('should report a key at a path no entry claims', () => {
        expect(findUnknownSchemaPaths({
            publicUrl: 'https://idp.example.com',
            server: {
                core: {
                    port: 3002,
                    publicUrl: 'https://idp.example.com',
                    typo: true,
                },
            },
        }, SCHEMA)).toEqual([
            'server.core.publicUrl',
            'server.core.typo',
        ]);
    });

    it('should report nothing for a document that only holds claimed paths', () => {
        expect(findUnknownSchemaPaths({
            publicUrl: 'https://idp.example.com',
            host: '0.0.0.0',
            server: {
                core: { port: 3002 },
                adminConsole: { enabled: false },
            },
        }, SCHEMA)).toEqual([]);
    });

    it('should not walk into the value of a claimed key', () => {
        expect(findUnknownSchemaPaths({
            trustedOrigins: ['https://app.example.com'],
            server: { core: { port: 3002 } },
        }, SCHEMA)).toEqual([]);
    });

    it('should report a whole section no entry reaches', () => {
        expect(findUnknownSchemaPaths({ client: { adminConsole: { port: 3000 } } }, SCHEMA)).toEqual(['client']);
    });

    it('should never report an x- extension key', () => {
        expect(findUnknownSchemaPaths({
            'x-common': { anything: true },
            server: { core: { 'x-anchor': 1 } },
        }, SCHEMA)).toEqual([]);
    });

    it('should report nothing for a non object tree', () => {
        expect(findUnknownSchemaPaths(undefined, SCHEMA)).toEqual([]);
    });
});

describe('readEnvBoolOrString', () => {
    it('should skip a blank value', () => {
        expect(readEnvBoolOrString('', 'REDIS')).toBeUndefined();
    });

    it('should read a boolean word', () => {
        expect(readEnvBoolOrString('false', 'REDIS')).toEqual(false);
        expect(readEnvBoolOrString('true', 'REDIS')).toEqual(true);
    });

    it('should pass a connection string through', () => {
        expect(readEnvBoolOrString('redis://127.0.0.1', 'REDIS')).toEqual('redis://127.0.0.1');
    });
});

describe('buildSchemaJSONSchema', () => {
    it('should nest every key at its resolved path', () => {
        const document = buildSchemaJSONSchema(SCHEMA, { title: 'authup' });

        expect(document.$schema).toEqual('http://json-schema.org/draft-07/schema#');
        expect(document.title).toEqual('authup');

        const properties = document.properties as Record<string, any>;

        expect(properties.publicUrl.type).toEqual('string');
        expect(properties.server.type).toEqual('object');
        expect(properties.server.properties.core.properties.port.type).toEqual('number');
        expect(properties.server.properties.adminConsole.properties.enabled.type).toEqual('boolean');
    });

    /**
     * A section describes locations of the same document its parent does, so
     * it must not become a property of its own: the emitted schema is what an
     * editor validates a real file against.
     */
    it('should describe a section by its path, never by its key', () => {
        const properties = buildSchemaJSONSchema(SCHEMA, { title: 'authup' }).properties as Record<string, any>;

        expect(properties).not.toHaveProperty('core');
        expect(properties).not.toHaveProperty('adminConsole');
        expect(properties.server.properties.core.properties).not.toHaveProperty('server');
    });

    it('should carry the description, default and env name on the leaf', () => {
        const document = buildSchemaJSONSchema(SCHEMA, { title: 'authup' });
        const properties = document.properties as Record<string, any>;

        expect(properties.server.properties.core.properties.port).toMatchObject({
            description: 'The port to listen on.',
            default: 3001,
            'x-authup-env': 'PORT',
        });
        expect(properties.publicUrl).not.toHaveProperty('default');
        expect(properties.publicUrl).not.toHaveProperty('x-authup-env');
    });

    /**
     * An alternative belongs to the key that declares it, and is published
     * there: repeating it would say this key owns a variable it borrows.
     */
    it('should publish the key own variable, never an alternative', () => {
        const properties = buildSchemaJSONSchema(SCHEMA, { title: 'authup' }).properties as Record<string, any>;

        expect(properties.server.properties.adminConsole.properties.host['x-authup-env'])
            .toEqual('ADMIN_CONSOLE_HOST');
        expect(properties.server.properties.core.properties.host).not.toHaveProperty('x-authup-env');
        expect(properties.host['x-authup-env']).toEqual('HOST');
    });

    it('should refuse to overwrite an existing location', () => {
        const schema : SchemaInput<{ server: string, port: number }> = {
            server: {
                type: z.string(),
                description: '',
                path: 'server',
            },
            port: {
                type: z.number(),
                description: '',
                path: 'server.core.port',
            },
        };

        expect(() => buildSchemaJSONSchema(schema, { title: 'authup' })).toThrow(/"port"/);

        const inverse : SchemaInput<{ port: number, server: string }> = {
            port: {
                type: z.number(),
                description: '',
                path: 'server.core.port',
            },
            server: {
                type: z.string(),
                description: '',
                path: 'server',
            },
        };

        expect(() => buildSchemaJSONSchema(inverse, { title: 'authup' })).toThrow(/"server"/);
    });
});
