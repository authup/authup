/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    addPlugin, addRouteMiddleware, defineNuxtModule, installModule,
} from '@nuxt/kit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { merge } from 'smob';
import './declare';
import type { RuntimeOptions } from './runtime/types';
import type { ModuleOptions } from './types';

export default defineNuxtModule<ModuleOptions>({
    meta: {
        name: '@authup/client-web-nuxt',
        configKey: 'authup',
    },
    defaults: {},
    async setup(options, nuxt) {
        await installModule('@pinia/nuxt');

        const runtimeDir = fileURLToPath(new URL('./runtime', import.meta.url));
        nuxt.options.build.transpile.push(runtimeDir);

        const runtimeOptions : RuntimeOptions = {
            apiURL: options.apiURL,
            apiURLRuntimeKey: options.apiURLRuntimeKey,

            cookieDomain: options.cookieDomain,
            cookieDomainRuntimeKey: options.cookieDomainRuntimeKey,

            homeRoute: options.homeRoute,
            loginRoute: options.loginRoute,
            logoutRoute: options.logoutRoute,
        };

        nuxt.options.runtimeConfig.public = nuxt.options.runtimeConfig.public || {};
        if (nuxt.options.runtimeConfig.public.authup) {
            nuxt.options.runtimeConfig.public.authup = merge(
                nuxt.options.runtimeConfig.public.authup,
                runtimeOptions,
            );
        } else {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            nuxt.options.runtimeConfig.public.authup = runtimeOptions;
        }

        addPlugin(path.resolve(runtimeDir, 'plugins/kit'));
        addPlugin(path.resolve(runtimeDir, 'plugins/root'));

        addRouteMiddleware({
            name: 'authup',
            path: path.resolve(runtimeDir, 'middleware/00.root'),
            global: true,
        });
    },
});
