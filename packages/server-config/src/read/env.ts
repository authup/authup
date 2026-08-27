/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { type ConfigSchemaInput, readSchemaFromEnv } from '@authup/server-config-kit';
import type { ObjectLiteral } from '@authup/kit';
import type { ConfigReadEvnOptions } from './types.ts';

export function readConfigRawFromEnv<I extends ObjectLiteral>(
    schema: ConfigSchemaInput<I>,
    options: ConfigReadEvnOptions<I> = {},
) : Partial<I> {
    const output = readSchemaFromEnv(schema);
    if (options.fn) {
        options.fn(output);
    }

    return output;
}
