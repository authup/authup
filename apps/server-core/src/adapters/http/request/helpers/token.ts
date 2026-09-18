/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenPayload } from '@authup/specs';
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
