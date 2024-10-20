/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Realm, User } from '@authup/core-kit';
import type { EventEmitter } from '@posva/event-emitter';

type RealmMinimal = Pick<Realm, 'id' | 'name'>;

export type StoreEventBusEvents = {
    loggingIn: [],
    loggedIn: [],
    loggingOut: [],
    loggedOut: [],
    resolving: [],
    resolved: [],

    accessTokenUpdated: string | null,
    accessTokenExpireDateUpdated: Date | null,
    refreshTokenUpdated: string | null,
    userUpdated: User | null,
    realmUpdated: RealmMinimal | null,
    realmManagementUpdated: RealmMinimal | null
};

export type StoreEventBus = EventEmitter<StoreEventBusEvents>;
