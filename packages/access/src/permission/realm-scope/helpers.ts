/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { REALM_SCOPE_ORDER, RealmScope } from './constants';

/**
 * Coerce an arbitrary value to a RealmScope, defaulting to `own` for missing /
 * null / unknown input (fail-closed). `none` is honoured only when explicit.
 */
export function normalizeRealmScope(value?: `${RealmScope}` | null): `${RealmScope}` {
    return value === RealmScope.ANY ||
        value === RealmScope.OWN_OR_NULL ||
        value === RealmScope.NONE ?
        value :
        RealmScope.OWN;
}

/**
 * Numeric comparison of two realm scopes by restrictiveness.
 * Negative when `a` is more restrictive than `b`, positive when less.
 */
export function compareRealmScope(
    a?: `${RealmScope}` | null,
    b?: `${RealmScope}` | null,
): number {
    return REALM_SCOPE_ORDER[normalizeRealmScope(a)] - REALM_SCOPE_ORDER[normalizeRealmScope(b)];
}

/** Fold scopes to the MOST permissive (ordered max). No args folds to `own`. */
export function maxRealmScope(...values: Array<`${RealmScope}` | null | undefined>): `${RealmScope}` {
    let max: `${RealmScope}` = RealmScope.NONE;
    let seen = false;
    for (const value of values) {
        seen = true;
        const scope = normalizeRealmScope(value);
        if (REALM_SCOPE_ORDER[scope] > REALM_SCOPE_ORDER[max]) {
            max = scope;
        }
    }
    // Empty input is fail-closed `own` (not `none`).
    return seen ? max : RealmScope.OWN;
}

/** Fold scopes to the MORE restrictive (ordered min) — used to CAP a grant. No args folds to `own`. */
export function minRealmScope(...values: Array<`${RealmScope}` | null | undefined>): `${RealmScope}` {
    let min: `${RealmScope}` = RealmScope.ANY;
    let seen = false;
    for (const value of values) {
        seen = true;
        const scope = normalizeRealmScope(value);
        if (REALM_SCOPE_ORDER[scope] < REALM_SCOPE_ORDER[min]) {
            min = scope;
        }
    }
    return seen ? min : RealmScope.OWN;
}

/**
 * Whether `scope` reaches a single resource realm `resourceRealmId` for an actor whose
 * realm is `identityRealmId`/`identityRealmName`.
 *
 * - `any`         -> always.
 * - `none`        -> never.
 * - realm-less actor (no realmId and no realmName) -> never `own`/`ownOrNull`.
 * - resource realm `null` (global) -> only `ownOrNull`.
 * - concrete resource realm -> must equal the actor's own realm (by id or name).
 */
function matchesSingle(
    normalized: `${RealmScope}`,
    resourceRealmId: string | null,
    identityRealmId: string | null,
    identityRealmName: string | null,
): boolean {
    if (resourceRealmId === null) {
        return normalized === RealmScope.OWN_OR_NULL;
    }
    return resourceRealmId === identityRealmId || resourceRealmId === identityRealmName;
}

/**
 * Whether `scope` reaches the resource. The resource realm may be presented as a single
 * id, `null` (global), or an array of realm ids — the array form (a resource that spans
 * multiple realms) requires the scope to reach EVERY listed realm (unanimous, fail-closed),
 * so any app/entity can express its realm via one or many keys under the canonical contract.
 */
export function realmScopeMatches(
    scope: `${RealmScope}` | null | undefined,
    resourceRealmId: string | string[] | null | undefined,
    identityRealmId: string | null | undefined,
    identityRealmName?: string | null,
): boolean {
    const normalized = normalizeRealmScope(scope);
    if (normalized === RealmScope.ANY) {
        return true;
    }
    if (normalized === RealmScope.NONE) {
        return false;
    }

    const realmId = identityRealmId ?? null;
    const realmName = identityRealmName ?? null;
    if (realmId === null && realmName === null) {
        return false;
    }

    if (Array.isArray(resourceRealmId)) {
        // Fail closed: an empty realm set is unreachable for a scoped actor (`any`
        // already returned above). `[].every()` would otherwise vacuously pass.
        if (resourceRealmId.length === 0) {
            return false;
        }
        return resourceRealmId.every((id) => matchesSingle(normalized, id ?? null, realmId, realmName));
    }

    return matchesSingle(normalized, resourceRealmId ?? null, realmId, realmName);
}
