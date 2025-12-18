/*
 * Copyright (c) 2023-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from 'redis-extension';
import type { RedisClientCreateInput } from '../../services';
import { createRedisClient } from '../../services';
import type { DomainEventPublishContext, IDomainEventPublisher } from '../type';
import { buildDomainEventChannelName, transformDomainEventData } from '../utils';

export class DomainEventRedisPublisher implements IDomainEventPublisher {
    protected driver : Client;

    constructor(input: RedisClientCreateInput) {
        this.driver = createRedisClient(input);
    }

    async publish(ctx: DomainEventPublishContext) : Promise<void> {
        const data = JSON.stringify(transformDomainEventData(ctx.content));

        const pipeline = this.driver.pipeline();
        for (let i = 0; i < ctx.destinations.length; i++) {
            const { namespace } = ctx.destinations[i];
            const keyPrefix = (namespace ? `${namespace}:` : '');

            let key = keyPrefix + buildDomainEventChannelName(ctx.destinations[i].channel);
            pipeline.publish(key, data);

            if (typeof ctx.destinations[i].channel === 'function') {
                key = keyPrefix + buildDomainEventChannelName(ctx.destinations[i].channel, ctx.content.data.id);
                pipeline.publish(key, data);
            }
        }

        await pipeline.exec();
    }
}
