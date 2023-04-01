/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

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
    if (hasProcessEnv(['UI_PORT', 'NUXT_UI_PORT', 'PORT', 'NUXT_PORT'])) {
        config.setRaw('port', readIntFromProcessEnv(['UI_PORT', 'NUXT_UI_PORT', 'PORT', 'NUXT_PORT']));
    }

    if (hasProcessEnv(['HOST', 'NUXT_HOST'])) {
        config.setRaw('host', readFromProcessEnv(['HOST', 'NUXT_HOST']));
    }

    if (hasProcessEnv(['API_URL', 'NUXT_API_URL'])) {
        config.setRaw('apiUrl', readFromProcessEnv(['API_URL', 'NUXT_API_URL']));
    }

    if (hasProcessEnv(['PUBLIC_URL', 'NUXT_PUBLIC_URL'])) {
        config.setRaw('publicUrl', readFromProcessEnv(['PUBLIC_URL', 'NUXT_PUBLIC_URL']));
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
                publicUrl: 'http://127.0.0.1:3000',
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

        // todo: apply host and port

        nuxt.options.runtimeConfig.public.apiUrl = config.get('apiUrl');
        nuxt.options.runtimeConfig.public.publicUrl = config.get('publicUrl');
    },
});
