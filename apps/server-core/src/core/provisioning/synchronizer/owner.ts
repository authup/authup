/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

type OwnedEntityAttributes = {
    name?: string | null,
    realmId?: string | null,
    clientId?: string | null,
};

/**
 * The lookup of a provisioned permission or role. A client-owned row is
 * found by its client alone, since the client pins its realm: a row an
 * earlier release stored without that realm is still the same row.
 */
export function buildOwnedEntityLookup(attributes: OwnedEntityAttributes): Record<string, unknown> {
    if (attributes.clientId) {
        return {
            name: attributes.name,
            clientId: attributes.clientId,
        };
    }

    return {
        name: attributes.name,
        realmId: attributes.realmId || null,
        clientId: null,
    };
}

/**
 * Whether a stored client-owned row lacks the realm of its client. A client
 * relation resolves the rows of the client's realm only, so such a row is
 * repaired whatever the strategy.
 */
export function needsOwningClientRealm(
    stored: OwnedEntityAttributes,
    input: OwnedEntityAttributes,
): boolean {
    return !!stored.clientId &&
        !stored.realmId &&
        !!input.realmId;
}
