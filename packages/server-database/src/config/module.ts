/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Config } from '@authelion/server-common';
import path from 'path';
import * as process from 'process';
import { merge } from 'smob';
import zod from 'zod';
import { Options, OptionsInput } from './type';
import { extractOptionsFromEnv } from './utils';

let instance : Config<Options, OptionsInput> | undefined;

export function useConfig() : Config<Options, OptionsInput> {
    if (typeof instance !== 'undefined') {
        return instance;
    }

    instance = new Config<Options, OptionsInput>({
        defaults: {
            adminUsername: 'admin',
            adminPassword: 'start123',
            robotEnabled: false,
            permissions: [],
            rootPath: process.cwd(),
            writableDirectoryPath: path.join(process.cwd(), 'writable'),
            env: process.env.NODE_ENV || 'development',
        },
        validators: {
            env: (value) => zod.string().safeParse(value),
            rootPath: (value) => zod.string().safeParse(value),
            writableDirectoryPath: (value) => zod.string().safeParse(value),
            adminUsername: (value) => zod.string().min(3).max(128).safeParse(value),
            adminPassword: (value) => zod.string().min(3).max(256).safeParse(value),
            adminPasswordReset: (value) => zod.boolean().safeParse(value),
            robotEnabled: (value) => zod.boolean().safeParse(value),
            robotSecret: (value) => zod.string().min(3).max(256).safeParse(value),
            robotSecretReset: (value) => zod.boolean().safeParse(value),
        },
        transformers: {
            permissions: (value) => {
                if (Array.isArray(value)) {
                    return value;
                }

                if (typeof value === 'string') {
                    return value.split(',');
                }

                return [];
            },
        },
    });

    return instance;
}
export function setConfig(options: OptionsInput) {
    options = merge({}, extractOptionsFromEnv(), options);

    const config = useConfig();
    config.setRaw(options);
}
