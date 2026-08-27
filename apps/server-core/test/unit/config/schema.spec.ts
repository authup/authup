/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { buildSchemaDefaults, resolveSchemaPath } from '@authup/server-config-kit';
import { describe, expect, it } from 'vitest';
import { CONFIG_SECTION } from '../../../src/app/modules/config/constants';
import { buildConfigJSONSchema } from '../../../src/app/modules/config/json-schema';
import {
    CORE_CONFIG_SCHEMA,
    ConfigEnvironmentVariableName,
    DEPLOYMENT_CONFIG_SCHEMA,
} from '@authup/server-config';
import { normalizeConfig } from '../../../src/app/modules/config/normalize';
import { CONFIG_SCHEMA } from '../../../src/app/modules/config/registry';
import type { Config } from '../../../src/app/modules/config/types';
import { DIST_PATH, PACKAGE_PATH } from '../../../src/path';

const CONFIG_KEYS = Object.keys(CONFIG_SCHEMA) as (keyof Config)[];

function readEnv(key: keyof Config, raw: string) : unknown {
    const entry = CONFIG_SCHEMA[key];
    if (!entry.env || !entry.readEnv) {
        throw new Error(`The config key ${key} carries no env reader.`);
    }

    return entry.readEnv(raw, entry.env);
}

describe('src/config/registry.ts', () => {
    describe('registry', () => {
        it('should map every environment variable name onto exactly one key', () => {
            const envNames : string[] = [];
            for (const key of CONFIG_KEYS) {
                const entry = CONFIG_SCHEMA[key];
                if (typeof entry.env !== 'undefined') {
                    envNames.push(entry.env);
                    expect(typeof entry.readEnv).toEqual('function');
                }
            }

            // No duplicates: two keys reading one variable would make which
            // of them wins an implementation detail of the read order.
            expect([...new Set(envNames)].length).toEqual(envNames.length);

            // Every name comes from the one enum the document declares, so a
            // typo cannot reach an operator. The enum is deliberately a
            // superset: it also carries the keys only a console service
            // reads.
            const known = Object.values(ConfigEnvironmentVariableName) as string[];
            for (const name of envNames) {
                expect(known).toContain(name);
            }
        });

        /**
         * The selection is by NAME, so nothing stops it from quietly omitting
         * a key of a section it reads in full: the omitted key is then read
         * as its default, in silence. Both sections are asserted whole, and
         * the surplus is exactly the five console keys server-core needs to
         * answer a request.
         */
        it('should select both of its sections in full, plus five console keys', () => {
            const sectioned = [
                ...Object.keys(DEPLOYMENT_CONFIG_SCHEMA),
                ...Object.keys(CORE_CONFIG_SCHEMA),
            ];

            for (const key of sectioned) {
                expect(CONFIG_SCHEMA).toHaveProperty(key);
            }

            expect(CONFIG_KEYS.filter((key) => !sectioned.includes(key)).sort()).toEqual([
                'accountConsoleEnabled',
                'accountConsoleUrl',
                'adminConsoleEnabled',
                'adminConsoleUrl',
                'authConsoleUrl',
            ]);
        });

        it('should declare exactly the keys normalizeConfig() outputs', async () => {
            // db has no static default, so normalizeConfig only carries the
            // key when the input supplies one.
            const config = await normalizeConfig({ db: { type: 'better-sqlite3', database: ':memory:' } });

            expect([...CONFIG_KEYS].sort()).toEqual(Object.keys(config).sort());
        });

        it('should build a default for every key except the derived ones', () => {
            const defaults = buildSchemaDefaults(CONFIG_SCHEMA);

            for (const key of CONFIG_KEYS) {
                if (key === 'publicUrl' || key === 'db') {
                    expect(defaults).not.toHaveProperty(key);
                } else {
                    expect(defaults).toHaveProperty(key);
                    expect(defaults[key]).not.toBeUndefined();
                }
            }

            expect(defaults.env).toEqual(expect.any(String));
            expect(defaults.rootPath).toEqual(process.cwd());
        });

        it('should hand out a fresh array default per call', () => {
            const first = buildSchemaDefaults(CONFIG_SCHEMA);
            const second = buildSchemaDefaults(CONFIG_SCHEMA);

            expect(first.permissions).toEqual(second.permissions);
            expect(first.permissions).not.toBe(second.permissions);
        });
    });

    describe('type', () => {
        it('should accept trustedOrigins with and without protocol and reject invalid entries', () => {
            const { type } = CONFIG_SCHEMA.trustedOrigins;

            expect(type.safeParse(['https://app.example.com', 'hub.local', 'hub.local:8080']).success).toEqual(true);
            expect(type.safeParse(['']).success).toEqual(false);
            expect(type.safeParse(['myapp://hub.local']).success).toEqual(false);
        });

        it('should bound passwordMinLength', () => {
            const { type } = CONFIG_SCHEMA.passwordMinLength;

            expect(type.safeParse(12).success).toEqual(true);
            expect(type.safeParse(0).success).toEqual(false);
            expect(type.safeParse(513).success).toEqual(false);
            expect(type.safeParse(10.5).success).toEqual(false);
        });

        it('should accept boolean process role keys and reject non-boolean values', () => {
            expect(CONFIG_SCHEMA.componentsEnabled.type.safeParse(false).success).toEqual(true);
            expect(CONFIG_SCHEMA.migrationEnabled.type.safeParse(false).success).toEqual(true);
            expect(CONFIG_SCHEMA.componentsEnabled.type.safeParse('nope').success).toEqual(false);
            expect(CONFIG_SCHEMA.migrationEnabled.type.safeParse('nope').success).toEqual(false);
        });

        it('should reject an unknown certificate source', () => {
            expect(CONFIG_SCHEMA.certificateSource.type.safeParse('automatic').success).toEqual(false);
        });

        it('should accept every non-function trustProxy form and reject mis-typed values', () => {
            const { type } = CONFIG_SCHEMA.trustProxy;

            expect(type.safeParse(false).success).toEqual(true);
            expect(type.safeParse(1).success).toEqual(true);
            expect(type.safeParse('loopback').success).toEqual(true);
            expect(type.safeParse(['10.0.0.1', '10.0.0.0/8']).success).toEqual(true);

            expect(type.safeParse(-1).success).toEqual(false);
            expect(type.safeParse(1.5).success).toEqual(false);
            expect(type.safeParse(2 ** 53).success).toEqual(false);
            expect(type.safeParse(['1']).success).toEqual(false);
            expect(type.safeParse(['true']).success).toEqual(false);
            expect(type.safeParse(['']).success).toEqual(false);
        });
    });

    describe('readEnv', () => {
        it('should read a strict boolean and fail loud on an unrecognized value', () => {
            expect(readEnv('mfaEnabled', 'yes')).toEqual(true);
            expect(() => readEnv('mfaEnabled', 'maybe')).toThrow(/MFA_ENABLED/);
            expect(readEnv('mfaEnabled', '  ')).toBeUndefined();
        });

        it('should read a lenient boolean and skip an unrecognized value', () => {
            expect(readEnv('registrationEnabled', 'yes')).toBeUndefined();
            expect(readEnv('registrationEnabled', '1')).toEqual(true);
        });

        it('should read a boolean or a connection string for a service', () => {
            expect(readEnv('redis', '')).toBeUndefined();
            expect(readEnv('redis', 'redis://x')).toEqual('redis://x');
            expect(readEnv('redis', 'false')).toEqual(false);
        });

        it('should keep the raw trustProxy string and skip a blank one', () => {
            expect(readEnv('trustProxy', ' 1 ')).toEqual(' 1 ');
            expect(readEnv('trustProxy', '  ')).toBeUndefined();
        });

        it('should read a comma-separated list and skip an empty one', () => {
            expect(readEnv('permissions', 'a, ,b')).toEqual(['a', 'b']);
            expect(readEnv('permissions', '')).toBeUndefined();
        });

        it('should read an integer and skip a non-numeric value', () => {
            expect(readEnv('port', 'abc')).toBeUndefined();
            expect(readEnv('port', '3001')).toEqual(3001);
        });

        it('should skip an empty string', () => {
            expect(readEnv('host', '')).toBeUndefined();
        });
    });

    describe('buildConfigJSONSchema', () => {
        const schema = buildConfigJSONSchema();

        // the document is shaped like authup.yml, so a property is reached at
        // the path its registry entry declares (or derives from the section).
        function resolveProperty(document: Record<string, unknown>, path: string) {
            let node = document;

            for (const segment of path.split('.')) {
                const properties = node.properties as Record<string, Record<string, unknown>>;
                expect(properties).toBeDefined();
                node = properties[segment];
                expect(node).toBeDefined();
            }

            return node;
        }

        function resolveKeyProperty(document: Record<string, unknown>, key: keyof Config) {
            return resolveProperty(document, resolveSchemaPath(key, CONFIG_SCHEMA[key], CONFIG_SECTION));
        }

        it('should emit a draft-07 object schema', () => {
            expect(schema.$schema).toEqual('http://json-schema.org/draft-07/schema#');
            expect(schema.type).toEqual('object');
        });

        it('should place every key at its declared path and describe it', () => {
            for (const key of CONFIG_KEYS) {
                const property = resolveKeyProperty(schema, key);

                expect(property.description).toEqual(expect.any(String));
                expect((property.description as string).length).toBeGreaterThan(0);
            }
        });

        it('should nest a section key and keep a deployment-wide one at the root', () => {
            const properties = schema.properties as Record<string, Record<string, unknown>>;

            expect(Object.keys(properties).sort()).toEqual([
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

            expect(resolveProperty(schema, 'server.core.port')).toBeDefined();
            expect(resolveProperty(schema, 'server.adminConsole.enabled')).toBeDefined();
            expect(resolveProperty(schema, 'server.adminConsole.url')).toBeDefined();
        });

        /**
         * The document describes every key an operator may write, not just
         * the ones this service reads: one `authup.yml` configures the whole
         * deployment, and an operator writing a console service's section
         * must not be told the key does not exist.
         */
        it('should describe the keys only another service reads', () => {
            expect(resolveProperty(schema, 'theme.directoryPath')).toBeDefined();
            expect(resolveProperty(schema, 'server.authConsole.port')).toBeDefined();
            expect(resolveProperty(schema, 'server.adminConsole.path')).toBeDefined();
            expect(resolveProperty(schema, 'server.accountConsole.host')).toBeDefined();
        });

        it('should carry the env name and the static default, and omit a process-derived default', () => {
            const port = resolveProperty(schema, 'server.core.port');
            expect(port['x-authup-env']).toEqual('PORT');
            expect(port.default).toEqual(3001);

            const rootPath = resolveProperty(schema, 'rootPath');
            expect(rootPath).not.toHaveProperty('x-authup-env');
            expect(rootPath).not.toHaveProperty('default');
        });

        it('should represent an enum type', () => {
            expect(resolveProperty(schema, 'server.core.certificateSource').enum)
                .toEqual(['disabled', 'standard', 'forwarded']);
        });

        it('should keep a derived key with an unrepresentable type', () => {
            const db = resolveProperty(schema, 'db');
            expect(db.description).toEqual(expect.any(String));
        });

        it('should serve the same document the authup.yml $schema line names', () => {
            // committed rather than generated at docs build time (that job
            // builds the documentation alone), so a registry change that
            // forgets to rebuild leaves it stale. Run
            // `npm run build:config-schema -w apps/server-core`.
            const filePath = path.join(PACKAGE_PATH, '..', '..', 'docs', 'src', 'public', 'schema', 'config.json');
            expect(existsSync(filePath)).toEqual(true);

            expect(JSON.parse(readFileSync(filePath, 'utf8'))).toEqual(schema);
        });

        it('should be published as dist/config-schema.json by the build', () => {
            const filePath = path.join(DIST_PATH, 'config-schema.json');
            expect(existsSync(filePath)).toEqual(true);

            const artifact = JSON.parse(readFileSync(filePath, 'utf8')) as Record<string, unknown>;
            for (const key of CONFIG_KEYS) {
                expect(resolveKeyProperty(artifact, key)).toBeDefined();
            }
        });
    });
});
