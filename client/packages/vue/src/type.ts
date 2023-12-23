/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { StoreManagerOptions } from '@vuecs/list-controls/core';
import type { APIClient } from '@authup/core';
import type { MaybeRef } from 'vue';
import type { SocketClient, Store } from './core';

export type Options = {
    storeManager?: StoreManagerOptions,
    components?: boolean | string[],
    apiClient?: APIClient,
    socketClient?: SocketClient,
    store?: Store,
    /**
     * Default: en
     */
    translatorLocale?: MaybeRef<string>
};
