/*
 * Copyright (c) 2025-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IPermissionEvaluator } from '@authup/access';
import type { Identity } from '@authup/core-kit';

export type ActorContext = {
    permissionEvaluator: IPermissionEvaluator;
    identity?: Identity;
    /**
     * The client the actor's credential was issued to, so a service delegating
     * the actor's grants resolves the same grants its gates evaluated (#3597).
     */
    credentialClientId?: string | null;
};
