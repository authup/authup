/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ConfigEnvironmentVariableName } from '../../../src/app/modules/config/constants';
import { buildConfigJSONSchema } from '../../../src/app/modules/config/json-schema';
import { normalizeConfig } from '../../../src/app/modules/config/normalize';
import { CONFIG_SCHEMA, buildConfigDefaults } from '../../../src/app/modules/config/schema';
import type { Config } from '../../../src/app/modules/config/types';
import { DIST_PATH } from '../../../src/path';

const CONFIG_KEYS = Object.keys(CONFIG_SCHEMA) as (keyof Config)[];

function readEnv(key: keyof Config, raw: string) : unknown {
    const entry = CONFIG_SCHEMA[key];
    if (!entry.env || !entry.readEnv) {
        throw new Error(`The config key ${key} carries no env reader.`);
    }

    return entry.readEnv(raw, entry.env);
}

describe('src/config/schema.ts', () => {
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

            expect([...envNames].sort()).toEqual(Object.values(ConfigEnvironmentVariableName).sort());
        });

        it('should declare exactly the keys normalizeConfig() outputs', async () => {
            // db has no static default, so normalizeConfig only carries the
            // key when the input supplies one.
            const config = await normalizeConfig({ db: { type: 'better-sqlite3', database: ':memory:' } });

            expect([...CONFIG_KEYS].sort()).toEqual(Object.keys(config).sort());
        });

        it('should build a default for every key except the derived ones', () => {
            const defaults = buildConfigDefaults();

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
            expect(readEnv('redis', '')).toEqual('');
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
        const properties = schema.properties as Record<string, Record<string, unknown>>;

        it('should emit a draft-07 object schema with one property per registry key', () => {
            expect(schema.$schema).toEqual('http://json-schema.org/draft-07/schema#');
            expect(schema.type).toEqual('object');
            expect(Object.keys(properties)).toEqual(CONFIG_KEYS);
        });

        it('should describe every property', () => {
            for (const key of CONFIG_KEYS) {
                expect(properties[key].description).toEqual(expect.any(String));
                expect((properties[key].description as string).length).toBeGreaterThan(0);
            }
        });

        it('should carry the env name and the static default, and omit a process-derived default', () => {
            expect(properties.port['x-authup-env']).toEqual('PORT');
            expect(properties.port.default).toEqual(3001);

            expect(properties.rootPath).not.toHaveProperty('x-authup-env');
            expect(properties.rootPath).not.toHaveProperty('default');
        });

        it('should represent an enum type', () => {
            expect(properties.certificateSource.enum).toEqual(['disabled', 'standard', 'forwarded']);
        });

        it('should keep a derived key with an unrepresentable type', () => {
            expect(properties.db).toBeDefined();
            expect(properties.db.description).toEqual(expect.any(String));
        });

        it('should be published as dist/config-schema.json by the build', () => {
            const filePath = path.join(DIST_PATH, 'config-schema.json');
            expect(existsSync(filePath)).toEqual(true);

            const artifact = JSON.parse(readFileSync(filePath, 'utf8')) as Record<string, unknown>;
            expect(Object.keys(artifact.properties as Record<string, unknown>)).toEqual(CONFIG_KEYS);
        });
    });
});
