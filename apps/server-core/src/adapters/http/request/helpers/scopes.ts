/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IAppEvent } from 'routup';

const sym = Symbol('Scopes');

export function useRequestScopes(event: IAppEvent) : string[] {
    const scopes = event.store[sym] as string[] | undefined;

    return scopes || [];
}

export function setRequestScopes(event: IAppEvent, scopes: string[]) {
    event.store[sym] = scopes;
}
