/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Adapter } from 'browser-storage-adapter';
import { useNuxtApp } from '#app';

export const useWarehouse = () : Adapter => {
    const nuxtApp = useNuxtApp();

    return nuxtApp.$warehouse;
};
