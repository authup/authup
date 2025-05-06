/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    addPlugin,
    addRouteMiddleware,
    addTemplate,
    createResolver,
    defineNuxtModule,
    installModule,
} from '@nuxt/kit';
import { merge } from 'smob';
import './declare';
import { fileURLToPath } from 'node:url';
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

        const resolver = createResolver(import.meta.url);

        const runtimeOptions : RuntimeOptions = {
            apiURL: options.apiURL,
            apiURLRuntimeKey: options.apiURLRuntimeKey,

            cookieDomain: options.cookieDomain,
            cookieDomainRuntimeKey: options.cookieDomainRuntimeKey,

            homeRoute: options.homeRoute,
            loginRoute: options.loginRoute,
        };

        nuxt.options.runtimeConfig.public = nuxt.options.runtimeConfig.public || {};
        if (nuxt.options.runtimeConfig.public.authup) {
            nuxt.options.runtimeConfig.public.authup = merge(
                nuxt.options.runtimeConfig.public.authup,
                runtimeOptions,
            );
        } else {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            nuxt.options.runtimeConfig.public.authup = runtimeOptions;
        }

        nuxt.options.alias['#authup/nuxt'] = resolver.resolve('./runtime/exports');

        const template = addTemplate({
            filename: 'types/authup-nuxt.d.ts',
            getContents: () => [
                'declare module \'#authup/nuxt\' {',
                `  const RouteMetaKey: typeof import('${resolver.resolve('./runtime/exports')}').RouteMetaKey`,
                '}',
            ].join('\n'),
        });

        nuxt.hook('prepare:types', async (options) => {
            options.references.push({ path: template.dst });
        });

        addPlugin(resolver.resolve('./runtime/plugins/kit'));
        addPlugin(resolver.resolve('./runtime/plugins/root'));

        addRouteMiddleware({
            name: 'authup',
            path: resolver.resolve('./runtime/middleware/00.root'),
            global: true,
        });
    },
});
