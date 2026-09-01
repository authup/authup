/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    buildSchemaDefaults,
    isSchemaEntryInput,
} from '@authup/server-config-kit';
import { describe, expect, it } from 'vitest';
import {
    CORE_SCHEMA,
    EnvironmentVariable,
    ROOT_SCHEMA,
} from '@authup/server-config';
import { normalizeConfig } from '../../../src/app/modules/config/read';
import type { Config } from '../../../src/app/modules/config/types';
import { CONFIG_SCHEMA } from '../../../src';

const CONFIG_KEYS = Object.keys(CONFIG_SCHEMA) as (keyof Config)[];

function readEnv(key: keyof Config, raw: string) : unknown {
    const entry = CONFIG_SCHEMA[key];
    if (!isSchemaEntryInput(entry) || !entry.env || !entry.readEnv) {
        throw new Error(`The config key ${key} carries no env reader.`);
    }

    return entry.readEnv(raw, entry.env);
}

describe('src/app/modules/config/constants.ts', () => {
    describe('registry', () => {
        it('should map every environment variable name onto exactly one key', () => {
            const envNames : string[] = [];
            for (const key of CONFIG_KEYS) {
                const entry = CONFIG_SCHEMA[key];
                if (isSchemaEntryInput(entry) && typeof entry.env !== 'undefined') {
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
            const known = Object.values(EnvironmentVariable) as string[];
            for (const name of envNames) {
                expect(known).toContain(name);
            }
        });

        /**
         * The selection is by NAME, so nothing stops it from quietly omitting
         * a key of a section it reads in full: the omitted key is then read
         * as its default, in silence. Both sections are asserted whole, and
         * the surplus is exactly the three console sections server-core needs
         * to answer a request.
         */
        it('should select both of its sections in full, plus three console sections', () => {
            const sectioned = [
                ...Object.keys(ROOT_SCHEMA),
                ...Object.keys(CORE_SCHEMA),
            ];

            for (const key of sectioned) {
                expect(CONFIG_SCHEMA).toHaveProperty(key);
            }

            expect(CONFIG_KEYS.filter((key) => !sectioned.includes(key)).sort()).toEqual([
                'accountConsole',
                'adminConsole',
                'authConsole',
            ]);

            // and out of each console only what a request needs: where a
            // browser reaches it, and whether it is served at all.
            expect(Object.keys(CONFIG_SCHEMA.authConsole)).toEqual(['url']);
            expect(Object.keys(CONFIG_SCHEMA.adminConsole).sort()).toEqual(['enabled', 'url']);
            expect(Object.keys(CONFIG_SCHEMA.accountConsole).sort()).toEqual(['enabled', 'url']);
        });

        it('should declare exactly the keys normalizeConfig() outputs', async () => {
            // db has no static default, so normalizeConfig only carries the
            // key when the input supplies one.
            const config = await normalizeConfig({ db: { type: 'better-sqlite3', database: ':memory:' } });

            expect([...CONFIG_KEYS].sort()).toEqual(Object.keys(config).sort());
        });

        it('should build a default for every key except the derived ones', () => {
            const defaults = buildSchemaDefaults<Config>(CONFIG_SCHEMA);

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
            const first = buildSchemaDefaults<Config>(CONFIG_SCHEMA);
            const second = buildSchemaDefaults<Config>(CONFIG_SCHEMA);

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
            expect(readEnv('writableDirectoryPath', '')).toBeUndefined();
        });

        /**
         * HOST is declared once, on the deployment-wide `host`, and every
         * listener INHERITS it rather than declaring a variable of its own.
         * The inheritance settles in `resolveSchemaData`, over merged data,
         * so it is asserted through a normalized config rather than through
         * a single entry's environment read.
         */
        it('should let this service inherit the deployment-wide host', async () => {
            // no variable of its own: HOST belongs to the root key
            expect(CONFIG_SCHEMA.host.env).toBeUndefined();

            expect((await normalizeConfig({ defaultHost: '127.0.0.1' })).host)
                .toEqual('127.0.0.1');

            // and a listener naming its own keeps it
            expect((await normalizeConfig({ defaultHost: '127.0.0.1', host: '10.0.0.5' })).host)
                .toEqual('10.0.0.5');
        });
    });
});
