/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IAppEvent } from 'routup';

const sym = Symbol('RCredentialClientId');

/**
 * The client the request's credential was issued to: the verified bearer's
 * `client_id`, stashed by the authorization middleware next to its scopes.
 * `null` for a credential issued to no client (a clientless token, Basic, the
 * console cookie), which narrows nothing (#3597).
 */
export function useRequestCredentialClientId(event: IAppEvent): string | null {
    return (event.store[sym] as string | undefined) ?? null;
}

export function setRequestCredentialClientId(event: IAppEvent, clientId: string): void {
    event.store[sym] = clientId;
}
