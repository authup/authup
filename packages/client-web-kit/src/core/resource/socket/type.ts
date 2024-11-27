/*
 * Copyright (c) 2023-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EventRecord } from '@authup/core-kit';
import type { EventFullName, EventNameSuffix } from '@authup/schema';
import type { MaybeRef } from 'vue';
import type { STCEventContext } from '@authup/core-realtime-kit';
import type { EntityID } from '../record';

export type ResourceSocketManagerCreateContext<
    TYPE extends string,
    RECORD extends Record<string, any>,
> = {
    type: TYPE,
    realmId?: MaybeRef<string | undefined>,
    target?: boolean,
    targetId?: MaybeRef<EntityID<RECORD> | undefined>,
    lockId?: MaybeRef<EntityID<RECORD> | undefined>,
    onCreated?(entity: RECORD): any,
    onUpdated?(entity: Partial<RECORD>): any,
    onDeleted?(entity: RECORD): any,
    processEvent?(event: STCEventContext<EventRecord<TYPE, RECORD>>, realmId?: string) : boolean;
    buildChannelName?(entityId?: EntityID<RECORD>) : string;
    buildSubscribeEventName?(): EventFullName<TYPE, `${EventNameSuffix.SUBSCRIBE}`>;
    buildUnsubscribeEventName?(): EventFullName<TYPE, `${EventNameSuffix.UNSUBSCRIBE}`>;
};

export type ResourceSocketManager = {
    mount() : void;
    unmount() : void;
};
