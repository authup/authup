/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { ConfigSchemaInput } from '../../src';
import {
    buildSchemaJSONSchema,
    composeSchemas,
    readEnvBoolOrString,
    readSchemaFromFileTree,
    resolveSchemaPath,
} from '../../src';

type Fixture = {
    port: number,
    publicUrl: string,
    trustedOrigins: string[],
    adminConsoleEnabled: boolean
};

const SCHEMA : ConfigSchemaInput<Fixture> = {
    port: {
        type: z.number(),
        description: 'The port to listen on.',
        default: 3001,
        env: 'PORT',
    },
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
    adminConsoleEnabled: {
        type: z.boolean(),
        description: 'Serve the admin console.',
        default: true,
        path: 'server.adminConsole.enabled',
    },
};

describe('resolveSchemaPath', () => {
    it('should prefer an explicit path', () => {
        expect(resolveSchemaPath('adminConsoleEnabled', { path: 'server.adminConsole.enabled' }, 'server.core'))
            .toEqual('server.adminConsole.enabled');
    });

    it('should apply the prefix', () => {
        expect(resolveSchemaPath('port', {}, 'server.core')).toEqual('server.core.port');
    });

    it('should fall back to the bare key', () => {
        expect(resolveSchemaPath('port', {})).toEqual('port');
    });
});

describe('readSchemaFromFileTree', () => {
    it('should read every key at its resolved path', () => {
        const data = readSchemaFromFileTree({
            publicUrl: 'https://idp.example.com',
            trustedOrigins: ['https://app.example.com'],
            server: {
                core: { port: 3002 },
                adminConsole: { enabled: false },
            },
        }, SCHEMA, { prefix: 'server.core' });

        expect(data).toEqual({
            port: 3002,
            publicUrl: 'https://idp.example.com',
            trustedOrigins: ['https://app.example.com'],
            adminConsoleEnabled: false,
        });
    });

    it('should skip a key the document says nothing about', () => {
        const data = readSchemaFromFileTree({ publicUrl: 'https://idp.example.com' }, SCHEMA, { prefix: 'server.core' });

        expect(data).toEqual({ publicUrl: 'https://idp.example.com' });
        expect(data).not.toHaveProperty('port');
    });

    it('should collect a falsy value', () => {
        const data = readSchemaFromFileTree({
            publicUrl: '',
            server: { core: { port: 0 }, adminConsole: { enabled: false } },
        }, SCHEMA, { prefix: 'server.core' });

        expect(data).toEqual({
            port: 0, 
            publicUrl: '', 
            adminConsoleEnabled: false, 
        });
    });

    it('should yield nothing for a non object tree', () => {
        expect(readSchemaFromFileTree(undefined, SCHEMA)).toEqual({});
        expect(readSchemaFromFileTree('authup.yml', SCHEMA)).toEqual({});
        expect(readSchemaFromFileTree([], SCHEMA)).toEqual({});
    });

    it('should not descend onto the prototype', () => {
        const schema : ConfigSchemaInput<{ polluted: string, name: string }> = {
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
        const document = buildSchemaJSONSchema(SCHEMA, { title: 'authup', prefix: 'server.core' });

        expect(document.$schema).toEqual('http://json-schema.org/draft-07/schema#');
        expect(document.title).toEqual('authup');

        const properties = document.properties as Record<string, any>;

        expect(properties.publicUrl.type).toEqual('string');
        expect(properties.server.type).toEqual('object');
        expect(properties.server.properties.core.properties.port.type).toEqual('number');
        expect(properties.server.properties.adminConsole.properties.enabled.type).toEqual('boolean');
    });

    it('should carry the description, default and env name on the leaf', () => {
        const document = buildSchemaJSONSchema(SCHEMA, { title: 'authup', prefix: 'server.core' });
        const properties = document.properties as Record<string, any>;

        expect(properties.server.properties.core.properties.port).toMatchObject({
            description: 'The port to listen on.',
            default: 3001,
            'x-authup-env': 'PORT',
        });
        expect(properties.publicUrl).not.toHaveProperty('default');
        expect(properties.publicUrl).not.toHaveProperty('x-authup-env');
    });

    it('should refuse to overwrite an existing location', () => {
        const schema : ConfigSchemaInput<{ server: string, port: number }> = {
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

        const inverse : ConfigSchemaInput<{ port: number, server: string }> = {
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

describe('composeSchemas', () => {
    const consoleSchema : ConfigSchemaInput<{ publicUrl: string, port: number }> = {
        publicUrl: {
            type: z.string(), 
            description: 'The public url.', 
            path: 'publicUrl', 
        },
        port: {
            type: z.number(), 
            description: 'The port to listen on.', 
            default: 3001, 
            env: 'PORT', 
        },
    };

    it('should merge registries with resolved paths', () => {
        const composed = composeSchemas([
            { prefix: 'server.core', schema: SCHEMA },
            { prefix: 'server.adminConsole', schema: { theme: { type: z.string(), description: '' } } },
        ]) as ConfigSchemaInput<any>;

        expect(composed.port.path).toEqual('server.core.port');
        expect(composed.adminConsoleEnabled.path).toEqual('server.adminConsole.enabled');
        expect(composed.theme.path).toEqual('server.adminConsole.theme');
    });

    it('should accept an agreeing duplicate', () => {
        const composed = composeSchemas([
            { prefix: 'server.core', schema: SCHEMA },
            { prefix: 'server.core', schema: consoleSchema },
        ]) as ConfigSchemaInput<any>;

        expect(composed.publicUrl.path).toEqual('publicUrl');
        expect(composed.port.path).toEqual('server.core.port');
    });

    it('should refuse a duplicate declared at another path', () => {
        expect(() => composeSchemas([
            { prefix: 'server.core', schema: SCHEMA },
            { prefix: 'server.adminConsole', schema: consoleSchema },
        ])).toThrow(/"port"/);
    });

    it('should refuse a duplicate reading another environment variable', () => {
        expect(() => composeSchemas([
            { prefix: 'server.core', schema: SCHEMA },
            {
                prefix: 'server.core',
                schema: {
                    port: {
                        type: z.number(), 
                        description: '', 
                        default: 3001, 
                        env: 'HTTP_PORT', 
                    }, 
                },
            },
        ])).toThrow(/HTTP_PORT/);
    });

    it('should refuse a duplicate carrying another default', () => {
        expect(() => composeSchemas([
            { prefix: 'server.core', schema: SCHEMA },
            {
                prefix: 'server.core',
                schema: {
                    port: {
                        type: z.number(), 
                        description: '', 
                        default: 3002, 
                        env: 'PORT', 
                    }, 
                },
            },
        ])).toThrow(/different defaults/);
    });

    it('should refuse a derived default against a static one', () => {
        expect(() => composeSchemas([
            { prefix: 'server.core', schema: SCHEMA },
            {
                prefix: 'server.core',
                schema: {
                    port: {
                        type: z.number(), 
                        description: '', 
                        default: () => 3001, 
                        env: 'PORT', 
                    }, 
                },
            },
        ])).toThrow(/different defaults/);
    });
});
