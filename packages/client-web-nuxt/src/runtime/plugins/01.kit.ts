/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { install } from '@authup/client-web-kit';
import { getPathValue } from 'pathtrace';
import type { Pinia } from 'pinia';
import {
    defineNuxtPlugin, tryUseNuxtApp, useCookie, useRuntimeConfig,
} from '#imports';
import type { AuthupRuntimeOptions } from '../types';

export default defineNuxtPlugin({
    name: 'authupKit',
    enforce: 'pre',
    dependsOn: ['authupPinia'],
    setup(ctx) {
        const runtimeConfig = useRuntimeConfig();

        let apiURL: string | undefined;
        let apiURLServer : string | undefined;

        let cookieDomain: string | undefined;

        const runtimeOptions = runtimeConfig.public.authup as AuthupRuntimeOptions;

        if (
            import.meta.server &&
                (
                    runtimeOptions.apiURLServer ||
                    runtimeOptions.apiURLServerRuntimeKey
                )
        ) {
            if (runtimeOptions.apiURLServer) {
                apiURLServer = runtimeOptions.apiURLServer;
            }

            if (runtimeOptions.apiURLServerRuntimeKey) {
                let pathValue = getPathValue(runtimeConfig, runtimeOptions.apiURLServerRuntimeKey);
                if (typeof pathValue === 'string') {
                    apiURLServer = pathValue;
                }

                pathValue = getPathValue(runtimeConfig.public, runtimeOptions.apiURLServerRuntimeKey);
                if (typeof pathValue === 'string') {
                    apiURLServer = pathValue;
                }
            }
        }

        if (runtimeOptions.apiURL) {
            apiURL = runtimeOptions.apiURL;
        }

        if (runtimeOptions.apiURLRuntimeKey) {
            const pathValue = getPathValue(runtimeConfig.public, runtimeOptions.apiURLRuntimeKey);
            if (typeof pathValue === 'string') {
                apiURL = pathValue;
            }
        }

        if (runtimeOptions.cookieDomain) {
            cookieDomain = runtimeOptions.cookieDomain;
        }

        if (runtimeOptions.cookieDomainRuntimeKey) {
            const pathValue = getPathValue(runtimeConfig.public, runtimeOptions.cookieDomainRuntimeKey);
            if (typeof pathValue === 'string') {
                cookieDomain = pathValue;
            }
        }

        if (!cookieDomain) {
            const { hostname } = new URL(apiURL || 'http://localhost:3000');
            cookieDomain = hostname;
        }

        if (cookieDomain === '127.0.0.1') {
            cookieDomain = 'localhost';
        }

        const cookieOptions : { domain?: string } = {
            domain: cookieDomain || 'localhost',
        };

        install(ctx.vueApp, {
            pinia: ctx.$pinia as Pinia,
            baseURL: apiURLServer || apiURL || 'http://localhost:3000',
            cookieSet: (key, value) => {
                const app = tryUseNuxtApp();
                if (app) {
                    const cookie = useCookie(key, cookieOptions);
                    cookie.value = value;
                }
            },
            cookieUnset: (key) => {
                const app = tryUseNuxtApp();
                if (app) {
                    const cookie = useCookie(key, cookieOptions);
                    cookie.value = null;
                }
            },
            cookieGet: (key) => {
                const app = tryUseNuxtApp();
                if (app) {
                    const cookie = useCookie(key, cookieOptions);
                    return cookie.value;
                }

                return null;
            },
            isServer: import.meta.server,
        });
    },
});
