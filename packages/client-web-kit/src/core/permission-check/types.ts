/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PermissionCheckerCheckContext } from '@authup/kit';
import type { Pinia } from 'pinia';
import type { App, Ref } from 'vue';
import type { Store } from '../store';

export type PermissionCheckerReactiveFnCreateContext = {
    store?: Store,
    pinia?: Pinia,
    app?: App
};

export type PermissionCheckerReactiveFn = (ctx: PermissionCheckerCheckContext) => Ref<boolean>;
