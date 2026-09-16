/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IAppEvent } from 'routup';

const sym = Symbol('RClientId');

/**
 * The client the request's token was issued to: the VERIFIED bearer's
 * `client_id`, stashed by the authorization middleware next to its scopes.
 * `null` for a request without a token client (a clientless token, Basic, the
 * console cookie), which narrows nothing (#3597).
 *
 * Not the subject's own client (`RequestIdentity.clientId`), and never a
 * `client_id` a request presents in its body.
 */
export function useRequestClientId(event: IAppEvent): string | null {
    return (event.store[sym] as string | undefined) ?? null;
}

export function setRequestClientId(event: IAppEvent, clientId: string): void {
    event.store[sym] = clientId;
}
