/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Whether a policy may be referenced from the given realm: a global policy
 * from anywhere, a realm's own policy from that realm alone.
 */
export function isPolicyOfRealm(
    policy: { realmId?: string | null },
    realmId: string | null,
) : boolean {
    return !policy.realmId || policy.realmId === realmId;
}
