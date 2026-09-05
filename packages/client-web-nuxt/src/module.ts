/*
 * Copyright (c) 2024-2026.
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

        // Spread rather than enumerate: `ModuleOptions` IS `RuntimeOptions`, so a
        // hand-written list can only ever fall behind the type. `serverApiURL`
        // already had, and the plugin read a value that never reached it. It is
        // the one server-only key and is split off into the private namespace:
        // the public one is serialized into every rendered page.
        const { serverApiURL, ...runtimeOptions } = options;

        nuxt.options.runtimeConfig.public = nuxt.options.runtimeConfig.public || {};
        if (nuxt.options.runtimeConfig.public.authup) {
            nuxt.options.runtimeConfig.public.authup = merge(
                nuxt.options.runtimeConfig.public.authup,
                runtimeOptions,
            );
        } else {
            nuxt.options.runtimeConfig.public.authup = runtimeOptions;
        }

        if (serverApiURL) {
            nuxt.options.runtimeConfig.authup = merge(
                (nuxt.options.runtimeConfig.authup || {}) as Record<string, unknown>,
                { serverApiURL },
            );
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
        addPlugin(resolver.resolve('./runtime/plugins/session-expiry'));
        addPlugin(resolver.resolve('./runtime/plugins/root'));

        addRouteMiddleware({
            name: 'authup',
            path: resolver.resolve('./runtime/middleware/00.root'),
            global: true,
        });
    },
});

