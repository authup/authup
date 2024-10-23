/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Realm, User } from '@authup/core-kit';
import type { EventEmitter } from '@posva/event-emitter';
import type { StoreDispatcherEventName } from './constants';

type RealmMinimal = Pick<Realm, 'id' | 'name'>;

export type StoreDispatcherEvents = {
    [StoreDispatcherEventName.LOGGING_IN]: [],
    [StoreDispatcherEventName.LOGGED_IN]: [],
    [StoreDispatcherEventName.LOGGING_OUT]: [],
    [StoreDispatcherEventName.LOGGED_OUT]: [],
    [StoreDispatcherEventName.RESOLVING]: [],
    [StoreDispatcherEventName.RESOLVED]: [],

    [StoreDispatcherEventName.ACCESS_TOKEN_UPDATED]: string | null,
    [StoreDispatcherEventName.ACCESS_TOKEN_EXPIRE_DATE_UPDATED]: Date | null,

    [StoreDispatcherEventName.REFRESH_TOKEN_UPDATED]: string | null,
    [StoreDispatcherEventName.USER_UPDATED]: User | null,
    [StoreDispatcherEventName.REALM_UPDATED]: RealmMinimal | null,
    [StoreDispatcherEventName.REALM_MANAGEMENT_UPDATED]: RealmMinimal | null,
};

export type StoreDispatcher = EventEmitter<{
    [K in keyof StoreDispatcherEvents as `${K}`]: StoreDispatcherEvents[K]
}>;
