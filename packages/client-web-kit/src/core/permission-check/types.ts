/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PermissionEvaluationContext } from '@authup/access';
import type { Pinia } from 'pinia';
import type { App, Ref } from 'vue';
import type { Store } from '../store';

export type PermissionCheckerReactiveFnCreateContext = {
    store?: Store,
    pinia?: Pinia,
    app?: App
};

export type PermissionCheckerReactiveFnContext = PermissionEvaluationContext |
(() => PermissionEvaluationContext);

export type PermissionCheckerReactiveFn = (ctx: PermissionCheckerReactiveFnContext) => Ref<boolean>;

export type PermissionCheckState = {
    /** The verdict, fail-closed `false` until the evaluation settles. */
    allowed: Ref<boolean>,
    /** Whether `allowed` is the settled verdict rather than the default. */
    settled: Ref<boolean>
};

export type PermissionCheckerReactiveStateFn = (ctx: PermissionCheckerReactiveFnContext) => PermissionCheckState;
