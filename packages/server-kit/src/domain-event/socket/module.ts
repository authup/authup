/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { buildEventFullName } from '@authup/core-realtime-kit';
import { Emitter } from '@socket.io/redis-emitter';
import type { RedisClientCreateInput } from '../../services';
import { createRedisClient } from '../../services';
import type { DomainEventPublishContext, IDomainEventPublisher } from '../type';
import { buildDomainEventChannelName, transformDomainEventData } from '../utils';

export class DomainEventSocketPublisher implements IDomainEventPublisher {
    protected driver : Emitter;

    constructor(input: RedisClientCreateInput) {
        const client = createRedisClient(input);
        this.driver = new Emitter(client);
    }

    async publish(ctx: DomainEventPublishContext) : Promise<void> {
        ctx.content = transformDomainEventData(ctx.content);

        for (let i = 0; i < ctx.destinations.length; i++) {
            const destination = ctx.destinations[i];

            let emitter : Emitter;

            if (destination.namespace) {
                emitter = this.driver.of(destination.namespace);
            } else {
                emitter = this.driver;
            }

            let roomName = buildDomainEventChannelName(destination.channel);

            const fullEventName = buildEventFullName(ctx.content.type, ctx.content.event);

            emitter
                .in(roomName)
                .emit(fullEventName, {
                    ...ctx.content,
                    meta: {
                        roomName,
                    },
                });

            if (typeof destination.channel === 'function') {
                roomName = buildDomainEventChannelName(destination.channel, ctx.content.data.id);

                emitter
                    .in(roomName)
                    .emit(fullEventName, {
                        ...ctx.content,
                        meta: {
                            roomName,
                            roomId: ctx.content.data.id,
                        },
                    });
            }
        }
    }
}
