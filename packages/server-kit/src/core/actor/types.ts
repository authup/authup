/*
 * Copyright (c) 2025-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IPermissionEvaluator, PermissionPolicyBinding } from '@authup/access';
import type { Identity } from '@authup/core-kit';

/**
 * The identity a resource server holds for a caller: what an introspected
 * token offers (`sub`, `sub_kind`, `realm_id`, `realm_name`, `client_id`).
 */
export type ActorIdentity = {
    /** user, client */
    type: string,
    id: string,
    realmId?: string | null,
    realmName?: string | null,
    clientId?: string | null,
};

/**
 * An evaluator that can hand out a copy of itself holding only those of
 * its own grants that one of `grants` names (same permission, reach and
 * policy), so never more than the actor holds. Lets a service tell which
 * grant passes a gate.
 */
export interface INarrowablePermissionEvaluator extends IPermissionEvaluator {
    narrowGrants(grants: PermissionPolicyBinding[]): IPermissionEvaluator;
}

/**
 * What a service receives instead of a request. The identity defaults to
 * the full user or client row (server-core); a resource server uses
 * `ActorContext<ActorIdentity>`.
 */
export type ActorContext<TIdentity = Identity> = {
    permissionEvaluator: INarrowablePermissionEvaluator;
    identity?: TIdentity;
    /**
     * The actor's own grants, as its request resolved them (for a token, the
     * grants that token carries). A service delegating the actor's grants reads
     * these, so it checks exactly what the actor's gates evaluated.
     */
    grants?: () => Promise<PermissionPolicyBinding[]>;
};
