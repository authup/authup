/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { HTTPClient } from '@authup/common';
import { useNuxtApp } from '#app';

export const useAPI = () : HTTPClient => {
    const nuxtApp = useNuxtApp();

    return nuxtApp.$api;
};
