/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Whether a resource of `resourceRealmId` may be referenced from `realmId`:
 * a global resource (null) from anywhere, a realm's own resource only from
 * that realm. Not symmetric: a null `realmId` reaches global resources only.
 */
export function isRealmReachable(
    resourceRealmId: string | null | undefined,
    realmId: string | null | undefined,
) : boolean {
    return !resourceRealmId || resourceRealmId === (realmId ?? null);
}
