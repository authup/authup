/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Actor-relative realm reach of a permission grant.
 *
 * Total order (least -> most permissive): none < own < own_or_null < any.
 * A missing/unknown column coerces to `own` (fail-closed); `none` is only ever an
 * explicit value (the grant reaches no realm at all).
 */
export enum RealmScope {
    /** No reach — the grant matches no resource realm. */
    NONE = 'none',
    /** Own realm only — resource realm must equal the actor's realm. */
    OWN = 'own',
    /** Own realm or null/global resources (realm_id === null). */
    OWN_OR_NULL = 'own_or_null',
    /** Any realm, including null/global. */
    ANY = 'any',
}

export type RealmScopeValue = `${RealmScope}`;

const REALM_SCOPE_ORDER: Record<RealmScope, number> = {
    [RealmScope.NONE]: 0,
    [RealmScope.OWN]: 1,
    [RealmScope.OWN_OR_NULL]: 2,
    [RealmScope.ANY]: 3,
};

/**
 * Coerce an arbitrary value to a RealmScope, defaulting to `own` for missing /
 * null / unknown input (fail-closed). `none` is honoured only when explicit.
 */
export function normalizeRealmScope(value?: RealmScopeValue | RealmScope | null): RealmScope {
    if (value === RealmScope.NONE) {
        return RealmScope.NONE;
    }
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

/** Fold a list of scopes to the MOST permissive (ordered max). Empty folds to `own`. */
export function maxRealmScope(values: Array<RealmScopeValue | RealmScope | null | undefined>): RealmScope {
    let max: RealmScope = RealmScope.NONE;
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

/** The MORE restrictive (ordered min) of two scopes — used to CAP a grant. */
export function minRealmScope(
    a?: RealmScopeValue | RealmScope | null,
    b?: RealmScopeValue | RealmScope | null,
): RealmScope {
    const sa = normalizeRealmScope(a);
    const sb = normalizeRealmScope(b);
    return REALM_SCOPE_ORDER[sa] <= REALM_SCOPE_ORDER[sb] ? sa : sb;
}

/**
 * Whether `scope` reaches a single resource realm `resourceRealmId` for an actor whose
 * realm is `identityRealmId`/`identityRealmName`.
 *
 * - `any`         -> always.
 * - `none`        -> never.
 * - realm-less actor (no realmId and no realmName) -> never `own`/`own_or_null`.
 * - resource realm `null` (global) -> only `own_or_null`.
 * - concrete resource realm -> must equal the actor's own realm (by id or name).
 */
function matchesSingle(
    normalized: RealmScope,
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
    scope: RealmScopeValue | RealmScope | null | undefined,
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
        return resourceRealmId.every((id) => matchesSingle(normalized, id ?? null, realmId, realmName));
    }

    return matchesSingle(normalized, resourceRealmId ?? null, realmId, realmName);
}
