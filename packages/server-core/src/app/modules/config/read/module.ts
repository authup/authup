/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { merge } from 'smob';
import type { ConfigInput } from '../types';
import { readConfigRawFromEnv } from './env';
import { readConfigRawFromFS } from './fs';
import type { ConfigRawReadOptions } from './types';

export async function readConfigRaw(options: ConfigRawReadOptions = {}) : Promise<ConfigInput> {
    if (options.fs && options.env) {
        const fsOptions = boolableToObject(options.fs);
        const fs = await readConfigRawFromFS(fsOptions);
        const env = readConfigRawFromEnv();

        return merge(env, fs);
    }

    if (options.fs) {
        const fsOptions = boolableToObject(options.fs);
        return readConfigRawFromFS(fsOptions);
    }

    if (options.env) {
        return readConfigRawFromEnv();
    }

    return {};
}

function boolableToObject<T>(input: T | boolean) : T {
    if (typeof input === 'boolean') {
        return {} as T;
    }

    return input;
}
