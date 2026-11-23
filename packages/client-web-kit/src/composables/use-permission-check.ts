/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Ref } from 'vue';
import type { PermissionCheckState, PermissionCheckerReactiveFnContext } from '../core/index.ts';
import { createPermissionCheckerReactiveFn, createPermissionCheckerReactiveStateFn } from '../core/index.ts';

/**
 * A bare `name` checks the global definition. A definition a realm or a
 * client owns is checked by passing the owner's `realmId` / `clientId`
 * (ids, not names).
 *
 * Pass a getter for a reactive context (a `realmId` read from the store or
 * a prop): the check re-evaluates when the getter's dependencies change.
 */
export function usePermissionCheck(ctx: PermissionCheckerReactiveFnContext) : Ref<boolean> {
    const checkFn = createPermissionCheckerReactiveFn();

    return checkFn(ctx);
}

/**
 * {@see usePermissionCheck} plus whether the verdict has settled, for a
 * caller that must hold back until "denied" is known rather than assumed.
 */
export function usePermissionCheckState(ctx: PermissionCheckerReactiveFnContext) : PermissionCheckState {
    const checkFn = createPermissionCheckerReactiveStateFn();

    return checkFn(ctx);
}
