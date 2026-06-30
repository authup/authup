/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { RealmScope, minRealmScope } from '@authup/access';
import { hasOwnProperty } from '@authup/kit';
import type { ResolveJunctionGrantResult } from './types.ts';

/**
 * The privilege-escalation boundary for permission-binding junctions, shared verbatim by
 * role/user/client/robot-permission. Kept in ONE place (rather than copied into each service)
 * so the fail-closed cap/inherit rule is audited and changed once — see #3160 / #3158 / #3159,
 * which each had to patch this rule across all four services.
 *
 * It depends on a server-core type (`ResolveJunctionGrantResult`) and so cannot live on the
 * generic `JunctionEntityService` in `@authup/server-kit` (that would invert the layering).
 */

/**
 * Cap a junction CREATE to the actor's request-relative selected grant and inherit its policy.
 *
 * - `realm_scope` is capped to the actor's selected reach (`min(requested, grant.realmScope)`).
 * - The policy follows the grant: only a genuinely unrestricted actor (an UNCAPPED `any` reach
 *   AND no policy) may keep an explicitly-requested `policy_id`; any restricted/policy-bound
 *   actor inherits its own grant's policy (it can neither attach an unowned policy nor detach to
 *   widen). The check reads `grant.realmScope` UNCAPPED precisely to distinguish that case — the
 *   grant is returned uncapped by `resolveJunctionGrant` for exactly this reason.
 *
 * Mutates `validated` in place (mirrors the surrounding service style).
 */
export function applyJunctionCreateGrant(
    validated: Record<string, any>,
    grant: ResolveJunctionGrantResult,
): void {
    validated.realm_scope = minRealmScope([validated.realm_scope ?? RealmScope.OWN, grant.realmScope]);

    if (grant.realmScope !== RealmScope.ANY || grant.policy) {
        validated.policy_id = grant.policy ? grant.policy.id : null;
    }
}

export type BuildJunctionUpdateDataInput = {
    /** The validated update payload (UPDATE group) — presence of a key signals caller intent. */
    data: Record<string, any>,
    /** The persisted junction's current reach (used to re-cap a policy-only edit). */
    existingScope: `${RealmScope}`,
    /** The actor's UNCAPPED selected reach for this permission (`any` for system context). */
    actorScope: `${RealmScope}`,
    /** Whether the actor's selected grant carries no policy. */
    actorPolicyFree: boolean,
    /** The id of the actor's selected grant policy (null when policy-free). */
    actorPolicyId: string | null,
};

/**
 * Build the `{ realm_scope?, policy_id? }` delta for a junction UPDATE, capped to the actor's
 * request-relative grant.
 *
 * - An unrestricted (`any`, policy-free) actor may set/clear `policy_id` explicitly and is never
 *   narrowed.
 * - A restricted/policy-bound actor that touches the binding inherits its own grant's policy AND
 *   has the reach re-capped — including the EXISTING `realm_scope` when the update omits it, so a
 *   policy-only edit cannot leave a wider pre-existing reach standing (fail-OPEN otherwise: the
 *   persisted binding must always be dominated by a grant the actor really holds — #3160).
 */
export function buildJunctionUpdateData(input: BuildJunctionUpdateDataInput): Record<string, any> {
    const {
        data, 
        existingScope, 
        actorScope, 
        actorPolicyFree, 
        actorPolicyId,
    } = input;

    const updateData: Record<string, any> = {};

    const touchesScope = hasOwnProperty(data, 'realm_scope');
    const touchesPolicy = hasOwnProperty(data, 'policy_id');

    // CAP to the actor's ceiling — a restricted actor may narrow but never widen.
    // (`data` is the validated UPDATE payload, so realm_scope is already a valid enum value;
    // minRealmScope additionally normalizes any out-of-band input fail-closed to `own`.)
    if (touchesScope) {
        updateData.realm_scope = minRealmScope([data.realm_scope as `${RealmScope}`, actorScope]);
    }

    if (actorScope === RealmScope.ANY && actorPolicyFree) {
        if (touchesPolicy) {
            updateData.policy_id = data.policy_id;
        }
    } else if (touchesScope || touchesPolicy) {
        updateData.policy_id = actorPolicyId;

        if (!touchesScope) {
            updateData.realm_scope = minRealmScope([existingScope, actorScope]);
        }
    }

    return updateData;
}
