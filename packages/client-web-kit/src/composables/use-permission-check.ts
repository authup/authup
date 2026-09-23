/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PermissionEvaluationContext } from '@authup/access';
import type { Ref } from 'vue';
import type { PermissionCheckState } from '../core';
import { createPermissionCheckerReactiveFn, createPermissionCheckerReactiveStateFn } from '../core';

export function usePermissionCheck(ctx: PermissionEvaluationContext) : Ref<boolean> {
    const checkFn = createPermissionCheckerReactiveFn();

    return checkFn(ctx);
}

/**
 * {@see usePermissionCheck} plus whether the verdict has settled, for a
 * caller that must hold back until "denied" is known rather than assumed.
 */
export function usePermissionCheckState(ctx: PermissionEvaluationContext) : PermissionCheckState {
    const checkFn = createPermissionCheckerReactiveStateFn();

    return checkFn(ctx);
}
