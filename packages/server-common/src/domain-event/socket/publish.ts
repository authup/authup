/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DomainEventContext } from '@authup/common';
import { DomainEventName, buildDomainEventFullName } from '@authup/common';
import { hasClient, hasConfig } from 'redis-extension';
import type { DomainEventDestinations } from '../type';
import { buildDomainEventChannelName, transformEventData } from '../utils';
import { useSocketEmitter } from './singleton';

export function publishDomainSocketEvent(
    context: DomainEventContext,
    destinations: DomainEventDestinations,
) {
    if (!hasClient() && !hasConfig()) {
        return;
    }

    context = transformEventData(context);

    for (let i = 0; i < destinations.length; i++) {
        let emitter = useSocketEmitter();
        if (destinations[i].namespace) {
            emitter = emitter.of(destinations[i].namespace);
        }

        let roomName = buildDomainEventChannelName(destinations[i].channel);

        const fullEventName = buildDomainEventFullName(context.type, context.event);

        emitter
            .in(roomName)
            .emit(fullEventName, {
                data: context,
                meta: {
                    roomName,
                },
            });

        if (
            context.event !== DomainEventName.CREATED &&
            typeof destinations[i].channel === 'function'
        ) {
            roomName = buildDomainEventChannelName(destinations[i].channel, context.data.id);
            emitter
                .in(roomName)
                .emit(fullEventName, {
                    data: context,
                    meta: {
                        roomName,
                        roomId: context.data.id,
                    },
                });
        }
    }
}
