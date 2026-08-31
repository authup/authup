/*
 * Copyright (c) 2023-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    buildSchemaDefaults,
    mergeSchemaData,
    resolveSchemaData,
} from '@authup/server-config-kit';
import { parseConfig } from './parse.ts';
import type { Config, ConfigInput } from './types.ts';
import { CONFIG_SCHEMA } from './constants.ts';

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
