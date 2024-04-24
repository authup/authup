/*
 * Copyright (c) 2023-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    DomainEntity,
    DomainEntityID,
    DomainEventContext,
    DomainEventSubscriptionFullName,
    DomainType,
} from '@authup/core-kit';
import type { MaybeRef } from 'vue';
import type { STCEventContext } from '@authup/core-realtime-kit';

export type EntitySocketContext<
    A extends `${DomainType}`,
    T = DomainEntity<A>,
> = {
    type: A,
    realmId?: MaybeRef<string | undefined>,
    target?: boolean,
    targetId?: MaybeRef<DomainEntityID<T> | undefined>,
    lockId?: MaybeRef<DomainEntityID<T> | undefined>,
    onCreated?(entity: T): any,
    onUpdated?(entity: Partial<T>): any,
    onDeleted?(entity: T): any,
    processEvent?(event: STCEventContext<DomainEventContext<A>>, realmId?: string) : boolean;
    buildChannelName?(entityId?: DomainEntityID<T>) : string;
    buildSubscribeEventName?(): DomainEventSubscriptionFullName;
    buildUnsubscribeEventName?(): DomainEventSubscriptionFullName;
};

export type EntitySocket = {
    mount() : void;
    unmount() : void;
};
