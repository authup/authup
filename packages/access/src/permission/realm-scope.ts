/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Relative realm reach of a permission grant (actor-relative component).
 *
 * Total order (least -> most permissive): none < own < own_or_null < any.
 * A missing/unknown column coerces to `own` (fail-closed); `none` is only ever an
 * explicit value (relative match disabled — the grant reaches only its `realm_ids`).
 */
export enum RealmScope {
    /** No relative match — the grant reaches only the realms in its `realm_ids` allowlist. */
    NONE = 'none',
    /** Own realm only — resource realm must equal the actor's realm. */
    OWN = 'own',
    /** Own realm or null/global resources (realm_id === null). */
    OWN_OR_NULL = 'own_or_null',
    /** Any realm, including null/global. */
    ANY = 'any',
}

export type RealmScopeValue = `${RealmScope}`;

/**
 * The full realm reach of a grant: a relative component (`scope`) ORed with an
 * absolute allowlist of concrete realm ids (`realm_ids`). null/global is expressed
 * by the relative `own_or_null`, never by the allowlist.
 */
export type RealmReach = {
    scope: RealmScopeValue,
    realm_ids?: string[] | null,
};

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
 * Relative-component match: whether `scope` reaches a resource in `resourceRealmId`
 * for an actor whose realm is `identityRealmId`/`identityRealmName`.
 *
 * - `any`         -> always.
 * - `none`        -> never (allowlist-only grant).
 * - realm-less actor (no realmId and no realmName) -> never `own`/`own_or_null`.
 * - resource realm `null` (global) -> only `own_or_null`.
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
    if (normalized === RealmScope.NONE) {
        return false;
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

function normalizeRealmIds(realm_ids?: string[] | null): string[] {
    return Array.isArray(realm_ids) ? realm_ids.filter((id): id is string => typeof id === 'string') : [];
}

/**
 * Full reach match: the grant reaches the resource if its absolute allowlist contains
 * the (concrete) resource realm, OR its relative scope matches.
 */
export function realmReachMatches(
    reach: RealmReach,
    resourceRealmId: string | null | undefined,
    identityRealmId: string | null | undefined,
    identityRealmName?: string | null,
): boolean {
    const resource = resourceRealmId ?? null;
    if (resource !== null && normalizeRealmIds(reach.realm_ids).includes(resource)) {
        return true;
    }
    return realmScopeMatches(reach.scope, resourceRealmId, identityRealmId, identityRealmName);
}

/**
 * Fold an actor's grant reaches MOST-PERMISSIVE-WINS: ordered-max of the relative
 * scope, union of the absolute allowlists. Empty folds to fail-closed `own`.
 */
export function mergeRealmReach(reaches: RealmReach[]): RealmReach {
    if (reaches.length === 0) {
        return { scope: RealmScope.OWN, realm_ids: null };
    }
    const scope = maxRealmScope(reaches.map((r) => r.scope));
    const ids = new Set<string>();
    for (const reach of reaches) {
        for (const id of normalizeRealmIds(reach.realm_ids)) {
            ids.add(id);
        }
    }
    return { scope, realm_ids: ids.size > 0 ? [...ids] : null };
}

/**
 * Whether `parent` reach covers (⊇) `child` reach. Relative: parent.scope ≥ child.scope.
 * Absolute: each concrete realm in child.realm_ids must be covered by parent via
 * `any` or an explicit parent.realm_ids membership. The relative `own` is symbolic and
 * NEVER covers a concrete child realm id (deny-if-unsure — no escalation).
 */
export function realmReachSuperset(parent: RealmReach, child: RealmReach): boolean {
    if (compareRealmScope(parent.scope, child.scope) < 0) {
        return false;
    }

    const childIds = normalizeRealmIds(child.realm_ids);
    if (childIds.length === 0) {
        return true;
    }
    if (normalizeRealmScope(parent.scope) === RealmScope.ANY) {
        return true;
    }
    const parentIds = new Set(normalizeRealmIds(parent.realm_ids));
    return childIds.every((id) => parentIds.has(id));
}

/**
 * CAP a requested reach to the creator's ceiling (a creator may not grant broader
 * than it holds). Relative: min(requested, creator). Absolute: keep only requested
 * realm ids the creator can itself reach (`any`, or explicit creator.realm_ids
 * membership — the symbolic `own` never qualifies a concrete id).
 */
export function realmReachCap(requested: RealmReach, creator: RealmReach): RealmReach {
    const scope = minRealmScope(requested.scope, creator.scope) as RealmScopeValue;

    const requestedIds = normalizeRealmIds(requested.realm_ids);
    let realm_ids: string[] | null = null;
    if (requestedIds.length > 0) {
        if (normalizeRealmScope(creator.scope) === RealmScope.ANY) {
            realm_ids = [...requestedIds];
        } else {
            const creatorIds = new Set(normalizeRealmIds(creator.realm_ids));
            const allowed = requestedIds.filter((id) => creatorIds.has(id));
            realm_ids = allowed.length > 0 ? allowed : null;
        }
    }

    return { scope, realm_ids };
}
