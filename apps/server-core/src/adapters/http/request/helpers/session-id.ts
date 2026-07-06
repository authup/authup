/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IAppEvent } from 'routup';

const sym = Symbol('RSessionId');

/**
 * The id of the session the current bearer token belongs to (stashed by the
 * authorization middleware). Used by `/sessions` self-service (e.g. "revoke all
 * my other sessions").
 */
export function useRequestSessionId(event: IAppEvent): string | undefined {
    return event.store[sym] as string | undefined;
}

export function setRequestSessionId(event: IAppEvent, id: string): void {
    event.store[sym] = id;
}
