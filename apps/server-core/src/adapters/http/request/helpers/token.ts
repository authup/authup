/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenPayload } from '@authup/specs';
import { OAuth2LoginRequiredError } from '@authup/specs';
import type { IAppEvent } from 'routup';

const sym = Symbol('Token');

const payloadSym = Symbol('TokenPayload');

export function useRequestToken(event: IAppEvent) {
    return event.store[sym] as string | undefined;
}

export function setRequestToken(event: IAppEvent, token: string) {
    event.store[sym] = token;
}

/**
 * The verified payload of the request's bearer token. Absent for any other
 * credential (Basic, the console cookie).
 */
export function useRequestTokenPayload(event: IAppEvent) {
    return event.store[payloadSym] as OAuth2TokenPayload | undefined;
}

export function setRequestTokenPayload(event: IAppEvent, payload: OAuth2TokenPayload) {
    event.store[payloadSym] = payload;
}

/**
 * Refuse a bearer that was issued to a client on the two routes that AUTHORIZE
 * one: `POST /authorize` and `POST /device_authorization/approve`. Only the
 * user at the authorization server may authorize an application, and their
 * token there carries no client — the hosted password login, the MFA-ticket
 * completion built on it and the federated handoff all mint without one, and
 * Basic carries no token at all.
 *
 * Without it a holder of a token issued to client Y mints a code, and then a
 * token, for a public client X, which turns the client-owned grants the
 * narrowing withholds from Y back on (#3597, #3608). The console cookie is
 * refused on the same surface for the same reason (`isOAuth2IssuancePath`),
 * and this is that refusal for the other ambient credential.
 *
 * Deliberately not an equality check against the client being authorized. A
 * client re-authorizing ITSELF gains no grant it does not already hold, but it
 * does gain scope: the server records consent rather than gating on it, so the
 * request would widen its own token past the scopes the user approved, with no
 * browser and no consent screen. It also needs nothing but the request, where
 * a comparison needs the resolved client, which on the device path only core
 * knows.
 *
 * `HTTPOAuth2IdentityGrantType` is unregistered today but mints a grant
 * straight from the request identity: wiring it means calling this too.
 */
export function assertTokenMayAuthorize(event: IAppEvent) {
    if (useRequestTokenPayload(event)?.client_id) {
        throw OAuth2LoginRequiredError.tokenClientBound();
    }
}
