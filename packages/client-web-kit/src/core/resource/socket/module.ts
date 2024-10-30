/*
 * Copyright (c) 2023-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DomainEventName, REALM_MASTER_NAME, buildDomainChannelName,
} from '@authup/core-kit';
import type {
    DomainType,
    DomainTypeMap,
    EventRecord,
} from '@authup/core-kit';
import type { EventFullName } from '@authup/kit';
import { EventNameSuffix, buildEventFullName } from '@authup/kit';
import {
    computed, isRef, onMounted, onUnmounted, watch,
} from 'vue';
import type { STCEventContext } from '@authup/core-realtime-kit';
import { injectStore, storeToRefs } from '../../store';
import type { ResourceSocketManager, ResourceSocketManagerCreateContext } from './type';
import { injectSocketManager, isSocketManagerUsable } from '../../socket-manager';

function create<
    TYPE extends string,
    RECORD extends Record<string, any>,
>(
    ctx: ResourceSocketManagerCreateContext<TYPE, RECORD>,
) : ResourceSocketManager {
    if (!isSocketManagerUsable()) {
        return {
            mount() {

            },
            unmount() {

            },
        };
    }

    const socketManager = injectSocketManager();
    const store = injectStore();
    const storeRefs = storeToRefs(store);

    const realmId = computed(() => {
        if (storeRefs.realmName.value === REALM_MASTER_NAME) {
            return undefined;
        }

        if (isRef(ctx.realmId)) {
            return ctx.realmId.value;
        }

        if (ctx.realmId) {
            return ctx.realmId;
        }

        return storeRefs.realmId.value;
    });

    const targetId = computed(
        () => (
            isRef(ctx.targetId) ?
                ctx.targetId.value :
                ctx.targetId
        ),
    );

    const lockId = computed(
        () => (
            isRef(ctx.lockId) ?
                ctx.lockId.value :
                ctx.lockId
        ),
    );

    const processEvent = (
        event: STCEventContext<EventRecord<TYPE, RECORD>>,
    ) : boolean => {
        if (
            ctx.processEvent &&
            !ctx.processEvent(event, realmId.value)
        ) {
            return false;
        }

        const channelName = ctx.buildChannelName ?
            ctx.buildChannelName(targetId.value) :
            buildDomainChannelName(ctx.type, targetId.value);

        if (event.meta.roomName !== channelName) {
            return false;
        }

        if (ctx.target && (!targetId.value || targetId.value !== event.data.id)) {
            return false;
        }

        return event.data.id !== lockId.value;
    };

    const handleCreated = (
        event: STCEventContext<EventRecord<TYPE, RECORD>>,
    ) => {
        if (!processEvent(event)) {
            return;
        }

        if (ctx.onCreated) {
            ctx.onCreated(event.data as RECORD);
        }
    };

    const handleUpdated = (
        event: STCEventContext<EventRecord<TYPE, RECORD>>,
    ) => {
        if (!processEvent(event)) {
            return;
        }

        if (ctx.onUpdated) {
            ctx.onUpdated(event.data as RECORD);
        }
    };
    const handleDeleted = (
        event: STCEventContext<EventRecord<TYPE, RECORD>>,
    ) => {
        if (!processEvent(event)) {
            return;
        }

        if (ctx.onDeleted) {
            ctx.onDeleted(event.data as RECORD);
        }
    };

    let mounted = false;
    const mount = async () => {
        if ((ctx.target && !targetId.value) || mounted) {
            return;
        }

        mounted = true;

        const socket = await socketManager.connect(`/resources#${realmId.value}`);

        let event : EventFullName<TYPE, `${EventNameSuffix.SUBSCRIBE}`> | undefined;
        if (ctx.buildSubscribeEventName) {
            event = ctx.buildSubscribeEventName();
        } else {
            event = buildEventFullName(
                ctx.type as TYPE,
                EventNameSuffix.SUBSCRIBE,
            );
        }

        socket.emit(
            event,
            targetId.value,
        );

        if (ctx.onCreated) {
            socket.on(buildEventFullName(
                ctx.type as `${DomainType}`,
                DomainEventName.CREATED,
            ), handleCreated);
        }

        if (ctx.onUpdated) {
            socket.on(buildEventFullName(
                ctx.type as `${DomainType}`,
                DomainEventName.UPDATED,
            ), handleUpdated);
        }

        if (ctx.onDeleted) {
            socket.on(buildEventFullName(
                ctx.type as `${DomainType}`,
                DomainEventName.DELETED,
            ), handleDeleted);
        }
    };

    const unmount = async () => {
        if ((ctx.target && !targetId.value) || !mounted) {
            return;
        }

        mounted = false;

        const socket = await socketManager.connect(`/resources#${realmId.value}`);

        let event : EventFullName<TYPE, `${EventNameSuffix.UNSUBSCRIBE}`>;
        if (ctx.buildUnsubscribeEventName) {
            event = ctx.buildUnsubscribeEventName();
        } else {
            event = buildEventFullName(
                ctx.type as TYPE,
                EventNameSuffix.UNSUBSCRIBE,
            );
        }

        socket.emit(
            event,
            targetId.value,
        );

        if (ctx.onCreated) {
            socket.off(buildEventFullName(
                ctx.type as `${DomainType}`,
                DomainEventName.UPDATED,
            ), handleCreated);
        }

        if (ctx.onUpdated) {
            socket.off(buildEventFullName(
                ctx.type as `${DomainType}`,
                DomainEventName.UPDATED,
            ), handleUpdated);
        }

        if (ctx.onDeleted) {
            socket.off(buildEventFullName(
                ctx.type as `${DomainType}`,
                DomainEventName.DELETED,
            ), handleDeleted);
        }
    };

    onMounted(() => mount());
    onUnmounted(() => unmount());

    watch(targetId, (val, oldValue) => {
        if (val !== oldValue) {
            Promise.resolve()
                .then(() => unmount())
                .then(() => mount());
        }
    });

    return {
        mount,
        unmount,
    };
}

export function createResourceSocketManager<
    A extends keyof DomainTypeMap,
>(
    ctx: ResourceSocketManagerCreateContext<A, DomainTypeMap[A]>,
) : ResourceSocketManager {
    return create(ctx);
}
