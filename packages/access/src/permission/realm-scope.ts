/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Coarse, actor-relative realm reach of a permission grant.
 *
 * Total order (least -> most permissive): own < own_or_null < any.
 * The default (and the value a missing/unknown column coerces to) is the most
 * restrictive `own` — realm scoping is fail-closed.
 */
export enum RealmScope {
    /** Own realm only — resource realm must equal the actor's realm. */
    OWN = 'own',
    /** Own realm or null/global resources (realm_id === null). */
    OWN_OR_NULL = 'own_or_null',
    /** Any realm, including null/global. */
    ANY = 'any',
}

export type RealmScopeValue = `${RealmScope}`;

const REALM_SCOPE_ORDER: Record<RealmScope, number> = {
    [RealmScope.OWN]: 0,
    [RealmScope.OWN_OR_NULL]: 1,
    [RealmScope.ANY]: 2,
};

/**
 * Coerce an arbitrary value to a RealmScope, defaulting to the most restrictive
 * `own` for missing / null / unknown input (fail-closed).
 */
export function normalizeRealmScope(value?: RealmScopeValue | RealmScope | null): RealmScope {
    if (value === RealmScope.OWN_OR_NULL) {
        return RealmScope.OWN_OR_NULL;
    }
    if (value === RealmScope.ANY) {
        return RealmScope.ANY;
    }
    return RealmScope.OWN;
}

/**
 * Numeric comparison of two realm scopes by restrictiveness.
 * Negative when `a` is more restrictive than `b`, positive when less.
 */
export function compareRealmScope(
    a?: RealmScopeValue | RealmScope | null,
    b?: RealmScopeValue | RealmScope | null,
): number {
    return REALM_SCOPE_ORDER[normalizeRealmScope(a)] - REALM_SCOPE_ORDER[normalizeRealmScope(b)];
}

/**
 * Fold a list of scopes to the MOST permissive (ordered max). Empty / all-missing
 * folds to `own` (fail-closed).
 */
export function maxRealmScope(values: Array<RealmScopeValue | RealmScope | null | undefined>): RealmScope {
    let max: RealmScope = RealmScope.OWN;
    for (const value of values) {
        const scope = normalizeRealmScope(value);
        if (REALM_SCOPE_ORDER[scope] > REALM_SCOPE_ORDER[max]) {
            max = scope;
        }
    }
    return max;
}

/**
 * Return the MORE restrictive (ordered min) of two scopes — used to CAP a grant
 * to the creator's own ceiling on propagation.
 */
export function minRealmScope(
    a?: RealmScopeValue | RealmScope | null,
    b?: RealmScopeValue | RealmScope | null,
): RealmScope {
    const sa = normalizeRealmScope(a);
    const sb = normalizeRealmScope(b);
    return REALM_SCOPE_ORDER[sa] <= REALM_SCOPE_ORDER[sb] ? sa : sb;
}

/**
 * Evaluate whether a grant of the given realm scope reaches a resource in realm
 * `resourceRealmId`, for an actor whose realm is identified by `identityRealmId`
 * (and optionally `identityRealmName`).
 *
 * - `any`         -> always (no realm restriction).
 * - realm-less actor (neither realmId nor realmName) -> never matches `own` /
 *   `own_or_null` (a realm restriction cannot be satisfied without a realm).
 * - resource realm `null` (global) -> only `own_or_null` (and `any`).
 * - concrete resource realm -> must equal the actor's own realm (by id or name).
 */
export function realmScopeMatches(
    scope: RealmScopeValue | RealmScope | null | undefined,
    resourceRealmId: string | null | undefined,
    identityRealmId: string | null | undefined,
    identityRealmName?: string | null,
): boolean {
    const normalized = normalizeRealmScope(scope);
    if (normalized === RealmScope.ANY) {
        return true;
    }

    const realmId = identityRealmId ?? null;
    const realmName = identityRealmName ?? null;
    if (realmId === null && realmName === null) {
        return false;
    }

    const resource = resourceRealmId ?? null;
    if (resource === null) {
        return normalized === RealmScope.OWN_OR_NULL;
    }

    return resource === realmId || resource === realmName;
}
