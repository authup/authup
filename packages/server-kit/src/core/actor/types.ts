/*
 * Copyright (c) 2025-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IPermissionEvaluator, PermissionPolicyBinding } from '@authup/access';
import type { Identity } from '@authup/core-kit';

export type ActorContext = {
    permissionEvaluator: IPermissionEvaluator;
    identity?: Identity;
    /**
     * The actor's own grants, as its request resolved them (for a token, the
     * grants that token carries). A service delegating the actor's grants reads
     * these, so it checks exactly what the actor's gates evaluated.
     */
    grants?: () => Promise<PermissionPolicyBinding[]>;
};
