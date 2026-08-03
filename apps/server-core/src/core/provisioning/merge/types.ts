/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Structural view of a provisioning entity used by the deep merge.
 * Covers every entity shape (realm, client, user, role, permission, scope,
 * policy): the composite-key attribute bag plus the deep-mergeable groups.
 */
export type MergeableProvisioningEntity = {
    attributes: {
        name?: string,
        realmId?: string | null,
        clientId?: string | null,
    },
    strategy?: unknown,
    relations?: Record<string, unknown>,
    children?: MergeableProvisioningEntity[],
    extraAttributes?: Record<string, unknown>,
};
