/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IAppEvent } from 'routup';

const sym = Symbol('Token');

export function useRequestToken(event: IAppEvent) {
    return event.store[sym] as string | undefined;
}

export function setRequestToken(event: IAppEvent, token: string) {
    event.store[sym] = token;
}
