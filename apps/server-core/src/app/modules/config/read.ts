/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ConfigRawReadOptions, DatabaseConnectionOptions  } from '@authup/server-config';
import { readConfigRaw } from '@authup/server-config';
import type { Config, ConfigInput } from './types.ts';
import { hasEnvDataSourceOptions, readDataSourceOptionsFromEnv } from 'typeorm-extension';
import { isObject } from 'smob';
import { CONFIG_SCHEMA } from './constants.ts';
import {
    buildSchemaDefaults,
    mergeSchemaData,
    resolveSchemaData,
} from '@authup/server-config-kit';
import { parseConfig } from './parse.ts';

/**
 * Read config from env (and optionally fs) and normalize it.
 *
 * @param options
 */
export async function readConfig(options: ConfigRawReadOptions<Config> = {}) : Promise<Config> {
    const raw = await readConfigRaw(
        CONFIG_SCHEMA,
        {
            fs: options.fs,
            env: options.env ?
                {
                    ...(isObject(options.env) ? options.env : {}),
                    fn: (options) => {
                        // The DB_* names come from typeorm-extension and stay outside the registry.
                        if (hasEnvDataSourceOptions()) {
                        // the configuration surface is deliberately untyped here: `db` is
                        // authup's own loose shape, and typeorm's driver union carries
                        // dialects (mariadb) this service does not support anyway. The
                        // supported set is asserted at connect time.
                            options.db = readDataSourceOptionsFromEnv() as DatabaseConnectionOptions;
                        }
                    },
                } : false,
            ...options,
        },
    );

    return normalizeConfig(raw);
}

/**
 * The configuration this service runs on.
 *
 * There is nothing server-core-specific left here, and that is the point.
 * Every derivation, canonicalization and cross-key invariant this function
 * used to perform imperatively is declared on the key it belongs to, in
 * `@authup/server-config`, and applied by {@link resolveSchemaData}: the
 * issuer url derived from the core listener keys, the canonicalized trusted
 * origins, each console's url and the refusal of a foreign one, every
 * path made absolute against `rootPath`, the trustProxy shapes, and the
 * three flag implications.
 *
 * So this is the same three passes any other service runs, and a console
 * reading the same document computes the same answers without asking
 * server-core for them. That is what the hand-over of `publicUrl`,
 * `trustedOrigins` and `rootPath` from the CLI to the console services used
 * to paper over, and why a console started through its own bin used to get a
 * half-normalized document with no error to show for it.
 */
export async function normalizeConfig(input: ConfigInput = {}): Promise<Config> {
    const parsed = await parseConfig(input);

    return resolveSchemaData<Config>(
        CONFIG_SCHEMA,
        mergeSchemaData<Config>(
            CONFIG_SCHEMA,
            buildSchemaDefaults<Config>(CONFIG_SCHEMA),
            parsed,
        ),
    ) as Config;
}
