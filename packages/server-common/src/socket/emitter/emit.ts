/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasClient, hasConfig } from 'redis-extension';
import type { SocketEventName } from '@authup/common';
import { useSocketEmitter } from './singleton';
import type { SocketEmitterEventContext } from './type';

export function emitSocketEvent<
    EventName extends SocketEventName,
>(context: SocketEmitterEventContext<EventName>) {
    if (!hasClient() && !hasConfig()) {
        return;
    }

    const keys = Object.keys(context.data);
    for (let i = 0; i < keys.length; i++) {
        const value = context.data[keys[i]];
        if (value instanceof Date) {
            context.data[keys[i]] = value.toISOString();
        }
    }

    for (let i = 0; i < context.destinations.length; i++) {
        let emitter = useSocketEmitter();
        if (context.destinations[i].namespace) {
            emitter = emitter.of(context.destinations[i].namespace);
        }

        let roomName = context.destinations[i].roomNameFn();

        emitter
            .in(roomName)
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            .emit(context.operation, {
                meta: {
                    roomName,
                },
                data: context.data,
            });

        roomName = context.destinations[i].roomNameFn(context.data.id);
        emitter
            .in(roomName)
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            .emit(context.operation, {
                data: context.data,
                meta: {
                    roomName,
                    roomId: context.data.id,
                },
            });
    }
}
