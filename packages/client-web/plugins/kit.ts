/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { install as installAuthup } from '@authup/client-web-kit';
import { defineNuxtPlugin, useCookie, useRuntimeConfig } from '#imports';

export default defineNuxtPlugin((ctx) => {
    const runtimeConfig = useRuntimeConfig();
    const { apiUrl: baseURL } = runtimeConfig.public;

    ctx.vueApp.use(installAuthup, {
        baseURL,
        cookieSet: (key, value) => {
            const cookie = useCookie(key);
            cookie.value = value;
        },
        cookieUnset: (key) => {
            const cookie = useCookie(key);
            cookie.value = null;
        },
        cookieGet: (key) => {
            const cookie = useCookie(key);
            return cookie.value;
        },
    });
});
