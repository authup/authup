/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { type CookieOptions, install } from '@authup/client-web-kit';
import type { RuntimeConfig } from 'nuxt/schema';
import { getPathValue } from 'pathtrace';
import type { Pinia } from 'pinia';
import {
    defineNuxtPlugin, tryUseNuxtApp, useCookie, useRuntimeConfig,
} from '#imports';
import type { RuntimeOptions } from '../types';

function buildCookieOptions(runtimeConfig: RuntimeConfig) : CookieOptions {
    const options = runtimeConfig.public.authup as RuntimeOptions;

    let domain : string | undefined;
    if (options.cookieDomain) {
        domain = options.cookieDomain;
    }

    if (options.cookieDomainRuntimeKey) {
        const pathValue = getPathValue(runtimeConfig.public, options.cookieDomainRuntimeKey);
        if (typeof pathValue === 'string') {
            domain = pathValue;
        }
    }

    if (domain === '127.0.0.1') {
        domain = 'localhost';
    }

    const cookieOptions : CookieOptions = {};
    if (domain) {
        cookieOptions.domain = domain;
    }

    return cookieOptions;
}

function buildApiUrl(runtimeConfig: RuntimeConfig) : string {
    const options = runtimeConfig.public.authup as RuntimeOptions;

    let url: string | undefined;

    if (import.meta.server) {
        if (options.apiURLRuntimeKey) {
            const pathValue = getPathValue(runtimeConfig, options.apiURLRuntimeKey);
            if (typeof pathValue === 'string') {
                url = pathValue;
            }
        }
    }

    if (!url) {
        if (options.apiURL) {
            url = options.apiURL;
        }

        if (options.apiURLRuntimeKey) {
            const pathValue = getPathValue(runtimeConfig.public, options.apiURLRuntimeKey);
            if (typeof pathValue === 'string') {
                url = pathValue;
            }
        }
    }

    return url || 'http://localhost:3010';
}

export default defineNuxtPlugin({
    name: 'authup:kit',
    dependsOn: ['pinia'],
    setup(ctx) {
        const runtimeConfig = useRuntimeConfig();

        const baseURL = buildApiUrl(runtimeConfig);
        const cookieOptions = buildCookieOptions(runtimeConfig);

        install(ctx.vueApp, {
            pinia: ctx.$pinia as Pinia,
            baseURL,
            cookieSet: (key, value, options) => {
                const app = tryUseNuxtApp();
                if (app) {
                    const cookie = useCookie(key, {
                        ...cookieOptions,
                        ...(options || {}),
                    });
                    cookie.value = value;
                }
            },
            cookieUnset: (key, options) => {
                const app = tryUseNuxtApp();
                if (app) {
                    const cookie = useCookie(key, {
                        ...cookieOptions,
                        ...(options || {}),
                    });
                    cookie.value = null;
                }
            },
            cookieGet: (key) => {
                const app = tryUseNuxtApp();
                if (app) {
                    const cookie = useCookie(key);
                    return cookie.value;
                }

                return null;
            },
            isServer: import.meta.server,
        });
    },
});
