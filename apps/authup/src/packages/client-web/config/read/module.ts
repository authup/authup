/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { merge } from 'smob';
import type { ClientWebConfigInput } from '../type';
import { readClientWebConfigFromEnv } from './env';
import type { ClientWebConfigReadFsOptions } from './fs';
import { readClientWebConfigFromFS } from './fs';

export type ClientWebConfigRawReadOptions = {
    fs?: boolean | ClientWebConfigReadFsOptions,
    env?: boolean,
};

export async function readClientWebConfigRaw(options: ClientWebConfigRawReadOptions = {}) : Promise<ClientWebConfigInput> {
    if (options.fs && options.env) {
        const fsOptions = boolableToObject(options.fs);
        const fs = await readClientWebConfigFromFS(fsOptions);
        const env = readClientWebConfigFromEnv();

        return merge(env, fs);
    }

    if (options.fs) {
        const fsOptions = boolableToObject(options.fs);
        return readClientWebConfigFromFS(fsOptions);
    }

    if (options.env) {
        return readClientWebConfigFromEnv();
    }

    return {};
}

function boolableToObject<T>(input: T | boolean) : T {
    if (typeof input === 'boolean') {
        return {} as T;
    }

    return input;
}
