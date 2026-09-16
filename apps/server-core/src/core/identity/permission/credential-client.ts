/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Whether a user's grant owned by `ownerClientId` applies through a credential
 * issued to `credentialClientId` (#3597): an unowned grant always does, an
 * owned one only through its own client's credentials, and a credential issued
 * to no client narrows nothing.
 *
 * A DISJUNCTION on purpose. As an equality a credential carrying any client
 * dropped every global grant, which is nearly the whole catalogue.
 */
export function appliesThroughCredentialClient(
    ownerClientId: string | null | undefined,
    credentialClientId: string | null,
): boolean {
    return !credentialClientId || !ownerClientId || ownerClientId === credentialClientId;
}
