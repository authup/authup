/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Actor-relative realm reach of a permission grant.
 *
 * Total order (least -> most permissive): none < own < ownOrNull < any.
 * A missing/unknown column coerces to `own` (fail-closed); `none` is only ever an
 * explicit value (the grant reaches no realm at all).
 */
export enum RealmScope {
    /** No reach — the grant matches no resource realm. */
    NONE = 'none',
    /** Own realm only — resource realm must equal the actor's realm. */
    OWN = 'own',
    /** Own realm or null/global resources (realmId === null). */
    OWN_OR_NULL = 'ownOrNull',
    /** Any realm, including null/global. */
    ANY = 'any',
}

/** Numeric restrictiveness order — internal to the fold/compare helpers. */
export const REALM_SCOPE_ORDER: Record<`${RealmScope}`, number> = {
    [RealmScope.NONE]: 0,
    [RealmScope.OWN]: 1,
    [RealmScope.OWN_OR_NULL]: 2,
    [RealmScope.ANY]: 3,
};
