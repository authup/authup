/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PermissionCheckerCheckContext } from '@authup/protocols';
import type { Ref } from 'vue';
import { createPermissionCheckerReactiveFn } from '../core';

export function usePermissionCheck(ctx: PermissionCheckerCheckContext) : Ref<boolean> {
    const checkFn = createPermissionCheckerReactiveFn();

    return checkFn(ctx);
}
