/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenPayload } from '@authup/specs';
import type { IAppEvent } from 'routup';
import type { RequestIdentity } from './identity.ts';

const sym = Symbol('RMfaLoginTicket');

/**
 * A verified "MFA-pending" login ticket (kind: mfa_token, issue #3242) —
 * stashed on its own request slot, NEVER the main identity slot, so every
 * identity-gated route stays default-deny for a ticket bearer. Only the
 * challenge routes read it.
 */
export type RequestMfaLoginTicket = {
    identity: RequestIdentity,
    payload: OAuth2TokenPayload,
};

export function useRequestMfaLoginTicket(event: IAppEvent) : RequestMfaLoginTicket | undefined {
    return event.store[sym] as RequestMfaLoginTicket | undefined;
}

export function setRequestMfaLoginTicket(event: IAppEvent, input: RequestMfaLoginTicket) : void {
    event.store[sym] = input;
}
