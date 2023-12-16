/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { makeURLPublicAccessible } from '@authup/core';
import {
    hasProcessEnv, readConfigFile, readFromProcessEnv, readIntFromProcessEnv,
} from '@authup/server-core';
import { Continu } from 'continu';
import { defineNuxtModule } from 'nuxt/kit';
import zod from 'zod';

type Options = {
    port: number,
    host: string,
    apiUrl: string,
    publicUrl: string
};

function extendConfigWithEnv(config: Continu<Options>) {
    let keys = [
        'UI_PORT',
        'NITRO_UI_PORT',
        'NUXT_UI_PORT',
        'NUXT_PUBLIC_UI_PORT',
        'PORT',
        'NITRO_PORT',
        'NUXT_PORT',
        'NUXT_PUBLIC_PORT',
    ];
    if (hasProcessEnv(keys)) {
        config.setRaw('port', readIntFromProcessEnv(keys));
    }

    keys = [
        'HOST',
        'NITRO_HOST',
        'NUXT_HOST',
    ];

    if (hasProcessEnv(keys)) {
        config.setRaw('host', readFromProcessEnv(keys));
    }

    keys = [
        'API_URL',
        'NUXT_API_URL',
        'NUXT_PUBLIC_API_URL',
    ];

    if (hasProcessEnv(keys)) {
        config.setRaw('apiUrl', readFromProcessEnv(keys));
    }

    keys = [
        'PUBLIC_URL',
        'NUXT_PUBLIC_URL',
        'NUXT_PUBLIC_PUBLIC_URL',
    ];
    if (hasProcessEnv([])) {
        config.setRaw('publicUrl', readFromProcessEnv(keys));
    }
}

export default defineNuxtModule({
    meta: {
        name: 'config',
    },
    setup: async (_options, nuxt) => {
        const fileConfig = await readConfigFile({
            name: 'ui',
        });

        const config = new Continu<Options>({
            defaults: {
                port: 3000,
                host: '0.0.0.0',
                apiUrl: 'http://127.0.0.1:3001/',
            },
            getters: {
                publicUrl: (context) => `http://${makeURLPublicAccessible(context.get('host'))}:${context.get('port')}/`,
            },
            validators: {
                port: (value) => zod.number().nonnegative().safeParse(value),
                host: (value) => zod.string().safeParse(value),
                apiUrl: (value) => zod.string().url().safeParse(value),
                publicUrl: (value) => zod.string().url().safeParse(value),
            },
        });

        config.setRaw(fileConfig);

        extendConfigWithEnv(config);

        if (config.has('apiUrl')) {
            nuxt.options.runtimeConfig.public.apiUrl = config.get('apiUrl');
        }

        if (config.has('publicUrl')) {
            nuxt.options.runtimeConfig.public.publicUrl = config.get('publicUrl');
        }
    },
});
