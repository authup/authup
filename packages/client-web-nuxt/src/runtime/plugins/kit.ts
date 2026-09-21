/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    COLOR_MODE_COOKIE,
    COLOR_MODE_UNSET,
    type CookieOptions,
    LOCALE_COOKIE,
    LOCALE_UNSET,
    install,
} from '@authup/client-web-kit';
import { API_URL_DEFAULT } from '@authup/core-http-kit';
import type { RuntimeConfig } from 'nuxt/schema';
import { getPathValue } from 'pathtrace';
import type { Pinia } from 'pinia';
import type { Ref } from 'vue';
import { computed } from 'vue';
import {
    defineNuxtPlugin,
    tryUseNuxtApp,
    useCookie,
    useRuntimeConfig,
} from '#imports';
import type { RuntimeOptions } from '../types';

/**
 * The cookie attributes `@vuecs/nuxt` writes its two preference cookies
 * with (1y, lax, path `/`, plus whatever the host set under `vuecs.cookie` /
 * `vuecs.localeCookie`), so the record this ref writes is the one the host's
 * `useColorMode()` and locale plugin hold, not a second one next to it.
 */
type VuecsRuntimeOptions = {
    cookie?: CookieOptions,
    localeCookie?: CookieOptions
};

/**
 * A `useCookie` ref of the same name the host's own refs carry.
 *
 * That is what keeps them in step without either side being reachable from
 * here: Nuxt posts every write of a cookie ref on a `BroadcastChannel` per
 * cookie name (or the Cookie Store change event, under that experimental
 * flag), and every ref of that name adopts it. So the store seeding this ref
 * from the account reaches the host's `useColorMode()` and
 * `useLocaleManager()` refs, and a switcher writing one of those reaches the
 * store's watcher the same way. The vuecs locale plugin is `enforce: 'post'`,
 * so its manager does not exist yet when this plugin runs; the channel needs
 * no order.
 */
function buildPreferenceRef(
    name: string,
    unset: string,
    options: CookieOptions | undefined,
) : Ref<string> {
    const cookie = useCookie<string | null | undefined>(name, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
        ...(options || {}),
    });

    return computed<string>({
        get: () => cookie.value || unset,
        set: (value) => {
            cookie.value = value;
        },
    });
}

function buildPreferences(runtimeConfig: RuntimeConfig) {
    const vuecs = runtimeConfig.public.vuecs as VuecsRuntimeOptions | undefined;

    return {
        locale: buildPreferenceRef(LOCALE_COOKIE, LOCALE_UNSET, vuecs?.localeCookie || vuecs?.cookie),
        colorMode: buildPreferenceRef(COLOR_MODE_COOKIE, COLOR_MODE_UNSET, vuecs?.cookie),
    };
}

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

function buildCookieName(runtimeConfig: RuntimeConfig) : (key: string) => string {
    const options = runtimeConfig.public.authup as RuntimeOptions;

    if (!options.cookiePrefix) {
        return (key) => key;
    }

    return (key) => `${options.cookiePrefix}${key}`;
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

        const serverOptions = runtimeConfig.authup as Pick<RuntimeOptions, 'serverApiURL'> | undefined;
        if (serverOptions?.serverApiURL) {
            url = serverOptions.serverApiURL;
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

    return url || API_URL_DEFAULT;
}

export default defineNuxtPlugin({
    name: 'authup:kit',
    dependsOn: ['pinia'],
    setup(ctx) {
        const runtimeConfig = useRuntimeConfig();

        const baseURL = buildApiUrl(runtimeConfig);
        const cookieOptions = buildCookieOptions(runtimeConfig);
        // One function for all three, because a prefix on the write but not on
        // the read is a session the app can never hydrate again.
        const cookieName = buildCookieName(runtimeConfig);

        install(ctx.vueApp, {
            pinia: ctx.$pinia as Pinia,
            baseURL,
            cookieSet: (key, value, options) => {
                const app = tryUseNuxtApp();
                if (app) {
                    const cookie = useCookie(cookieName(key), {
                        ...cookieOptions,
                        ...(options || {}),
                    });
                    cookie.value = value;
                }
            },
            cookieUnset: (key, options) => {
                const app = tryUseNuxtApp();
                if (app) {
                    const cookie = useCookie(cookieName(key), {
                        ...cookieOptions,
                        ...(options || {}),
                    });
                    cookie.value = null;
                }
            },
            cookieGet: (key) => {
                const app = tryUseNuxtApp();
                if (app) {
                    const cookie = useCookie(cookieName(key));
                    return cookie.value;
                }

                return null;
            },
            isServer: import.meta.server,
            // Client only: a server render's cookie refs are per request and
            // never in step with one another, so a seed there would reach
            // nothing but a `Set-Cookie`, and the client's own resolve seeds
            // right after hydration anyway.
            preferences: import.meta.client ? buildPreferences(runtimeConfig) : undefined,
            // Same bucket `useAsyncData` transports its results in, so a
            // collection loaded during the server render is handed to the
            // browser through the regular Nuxt payload instead of being
            // fetched a second time on hydration.
            hydrationStore: {
                get: <T>(key: string) => ctx.payload.data[key] as T | undefined,
                set: (key: string, value: unknown) => {
                    ctx.payload.data[key] = value;
                },
                delete: (key: string) => {
                    delete ctx.payload.data[key];
                },
            },
        });
    },
});
