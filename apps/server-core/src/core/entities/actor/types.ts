/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IPermissionEvaluator, PolicyWithType } from '@authup/access';
import type { Identity } from '@authup/core-kit';

export type ResolveJunctionPolicyOptions = {
    name: string;
    realm_id?: string | null;
    client_id?: string | null;
};

export type ActorContext = {
    permissionEvaluator: IPermissionEvaluator;
    identity?: Identity;
    resolveJunctionPolicy?: (options: ResolveJunctionPolicyOptions) => Promise<PolicyWithType | undefined>;
};
