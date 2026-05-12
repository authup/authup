/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IRoutupEvent } from 'routup';
import { getRequestStringParam } from './param-id.ts';

const sym = Symbol('RRealmID');

export function setRequestRealmID(event: IRoutupEvent, id: string): void {
    event.store[sym] = id;
}

export function getRequestRealmID(event: IRoutupEvent): string | undefined {
    const stored = event.store[sym] as string | undefined;
    if (stored) {
        return stored;
    }
    return getRequestStringParam(event, 'realmId');
}

export function applyRouteRealmIDToBody(event: IRoutupEvent, data: Record<string, any>): void {
    const routeRealmId = getRequestRealmID(event);
    if (routeRealmId) {
        data.realm_id = routeRealmId;
    }
}
