/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    addPlugin, addRouteMiddleware, defineNuxtModule,
} from '@nuxt/kit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { merge } from 'smob';
import type { AuthupRuntimeOptions } from './runtime/types';
import type { ModuleOptions } from './types';

export default defineNuxtModule<ModuleOptions>({
    meta: {
        name: '@authup/client-web-nuxt',
        configKey: 'authup',
    },
    defaults: {},
    async setup(options, nuxt) {
        const runtimeDir = fileURLToPath(new URL('./runtime', import.meta.url));
        nuxt.options.build.transpile.push(runtimeDir);

        const runtimeOptions : AuthupRuntimeOptions = {
            apiURL: options.apiURL,
            apiURLRuntimeKey: options.apiURLRuntimeKey,

            apiURLServer: options.apiURLServer,
            apiURLServerRuntimeKey: options.apiURLServerRuntimeKey,

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

        addPlugin(path.resolve(runtimeDir, 'plugins/00.pinia'));
        addPlugin(path.resolve(runtimeDir, 'plugins/01.kit'));

        addRouteMiddleware({
            name: 'loggedIn',
            path: path.resolve(runtimeDir, 'middleware/00.session'),
            global: true,
        });
    },
});
