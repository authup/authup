/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from 'redis-extension';
import { DomainEventRedisPublisher } from './redis';
import { DomainEventSocketPublisher } from './socket';
import type { DomainEventPublishContent, DomainEventPublishContext, IDomainEventPublisher } from './type';

export class DomainEventPublisher implements IDomainEventPublisher {
    protected publishers : Set<IDomainEventPublisher>;

    constructor(client: Client) {
        this.publishers = new Set<IDomainEventPublisher>();
        this.publishers.add(new DomainEventRedisPublisher(client));
        this.publishers.add(new DomainEventSocketPublisher(client));
    }

    async publish<T extends DomainEventPublishContent>(
        ctx: DomainEventPublishContext<T>,
    ) : Promise<void> {
        const publishers = this.publishers.values();
        while (true) {
            const it = publishers.next();
            if (it.done) {
                return;
            }

            await it.value.publish(ctx);
        }
    }
}
