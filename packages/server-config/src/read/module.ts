/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { readConfigFileTree } from './fs.ts';
import type { ConfigRawReadOptions } from './types.ts';
import type { SchemaInput } from '@authup/server-config-kit';
import { mergeSchemaData, readSchemaFromFileTree  } from '@authup/server-config-kit';
import { readConfigRawFromEnv } from './env.ts';
import type { ObjectLiteral } from '@authup/kit';

export async function readConfigRaw<T extends ObjectLiteral>(
    schema: SchemaInput<T>,
    options: ConfigRawReadOptions<T> = {},
) : Promise<Partial<T>> {
    let fs : Partial<T> | undefined;
    if (options.fs) {
        const fsOptions = boolableToObject(options.fs);
        const { tree } = await readConfigFileTree(fsOptions);

        fs = readSchemaFromFileTree(tree, schema);
    }

    let env : Partial<T> | undefined;
    if (options.env) {
        const envOptions = boolableToObject(options.env);
        env = readConfigRawFromEnv(schema, envOptions);
    }

    if (fs && env) {
        // Schema-aware, so a list read from the environment REPLACES the
        // file's rather than being concatenated onto it, and the environment
        // wins because `mergeSchemaData` takes the last defined value.
        return mergeSchemaData(schema, fs, env);
    }

    if (fs) {
        return fs;
    }

    if (env) {
        return env;
    }

    return {} as T;
}

function boolableToObject<T>(input: T | boolean) : T {
    if (typeof input === 'boolean') {
        return {} as T;
    }

    return input;
}
