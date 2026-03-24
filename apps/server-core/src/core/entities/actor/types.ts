/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IPermissionEvaluator } from '@authup/access';
import type { Identity } from '@authup/core-kit';

export type ActorContext = {
    permissionEvaluator: IPermissionEvaluator;
    identity?: Identity;
};
