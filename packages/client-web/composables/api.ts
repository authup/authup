/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '@authup/core-http-kit';
import { useNuxtApp } from '#app';

export const useAPI = () : Client => {
    const nuxtApp = useNuxtApp();

    return nuxtApp.$api;
};
