/*
 * Copyright (c) 2023-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    DomainTypeEventMap,
    DomainTypeMap,
} from '@authup/core-kit';
import type { EventFullName, EventNameSuffix } from '@authup/kit';
import type { MaybeRef } from 'vue';
import type { STCEventContext } from '@authup/core-realtime-kit';
import type { EntityID } from '../entity-manager';

export type EntitySocketContext<
    A extends keyof DomainTypeMap,
    T = DomainTypeMap[A],
> = {
    type: A,
    realmId?: MaybeRef<string | undefined>,
    target?: boolean,
    targetId?: MaybeRef<EntityID<T> | undefined>,
    lockId?: MaybeRef<EntityID<T> | undefined>,
    onCreated?(entity: T): any,
    onUpdated?(entity: Partial<T>): any,
    onDeleted?(entity: T): any,
    processEvent?(event: STCEventContext<DomainTypeEventMap[A]>, realmId?: string) : boolean;
    buildChannelName?(entityId?: EntityID<T>) : string;
    buildSubscribeEventName?(): EventFullName<A, `${EventNameSuffix.SUBSCRIBE}`>;
    buildUnsubscribeEventName?(): EventFullName<A, `${EventNameSuffix.UNSUBSCRIBE}`>;
};

export type EntitySocket = {
    mount() : void;
    unmount() : void;
};
