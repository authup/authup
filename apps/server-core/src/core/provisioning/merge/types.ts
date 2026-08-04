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
export type MergeProvisioningOptions = {
    /**
     * May a source entry that declares no `strategy` inherit the target's?
     *
     * True for the composite source, where target/source are "earlier file"
     * and "later file" and inheriting an unspecified strategy is the
     * documented rule.
     *
     * False for the wildcard expansion, where the precedence is INVERTED:
     * the target is the wildcard (low precedence) and the source is an
     * explicit realm block (high precedence). Inheriting there would let a
     * wildcard child supply the lifecycle of an entity the operator declared
     * explicitly, and `absent` is part of that vocabulary, so a wildcard
     * sweep would delete the very row the explicit block declares.
     */
    inheritStrategy?: boolean,
};

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
