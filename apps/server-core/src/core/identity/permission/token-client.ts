/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Whether a user's grant owned by `ownerClientId` applies through a token
 * issued to `tokenClientId` (#3597): an unowned grant always does, an owned one
 * only through its own client's tokens, and a request without a token client
 * narrows nothing.
 *
 * A DISJUNCTION on purpose. As an equality a token carrying any client
 * dropped every global grant, which is nearly the whole catalogue.
 */
export function appliesThroughTokenClient(
    ownerClientId: string | null | undefined,
    tokenClientId: string | null,
): boolean {
    return !tokenClientId || !ownerClientId || ownerClientId === tokenClientId;
}
