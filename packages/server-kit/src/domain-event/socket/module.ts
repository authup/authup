/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { buildEventFullName } from '@authup/schema';
import { Emitter } from '@socket.io/redis-emitter';
import type { Client } from 'redis-extension';
import type { DomainEventPublishContext, IDomainEventPublisher } from '../type';
import { buildDomainEventChannelName, transformDomainEventData } from '../utils';

export class DomainEventSocketPublisher implements IDomainEventPublisher {
    protected driver : Emitter;

    constructor(client: Client) {
        this.driver = new Emitter(client);
    }

    async publish(ctx: DomainEventPublishContext) : Promise<void> {
        ctx.content = transformDomainEventData(ctx.content);

        for (let i = 0; i < ctx.destinations.length; i++) {
            let emitter : Emitter;
            if (ctx.destinations[i].namespace) {
                emitter = this.driver.of(ctx.destinations[i].namespace);
            } else {
                emitter = this.driver;
            }

            let roomName = buildDomainEventChannelName(ctx.destinations[i].channel);

            const fullEventName = buildEventFullName(ctx.content.type, ctx.content.event);

            emitter
                .in(roomName)
                .emit(fullEventName, {
                    ...ctx.content,
                    meta: {
                        roomName,
                    },
                });

            if (typeof ctx.destinations[i].channel === 'function') {
                roomName = buildDomainEventChannelName(ctx.destinations[i].channel, ctx.content.data.id);

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
