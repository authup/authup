/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createStore } from '@authup/client-vue';
import { defineStore } from 'pinia';
import { useRuntimeConfig } from '#imports';

export const useAuthStore = defineStore('auth', () => {
    const config = useRuntimeConfig();

    return createStore({ baseURL: config.public.apiUrl });
});
