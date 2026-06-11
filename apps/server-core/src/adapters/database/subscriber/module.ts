/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityType } from '@authup/core-kit';
import {
    EntityDefaultEventName,
    buildEntityChannelName,
    buildEntityNamespaceName,
} from '@authup/core-kit';
import type { DomainEventDestinations, IDomainEventPublisher } from '@authup/server-kit';
import type {
    DataSource,
    EntitySubscriberInterface,
    InsertEvent,
    ObjectLiteral,
    RemoveEvent,
    UpdateEvent,
} from 'typeorm';
import type { EntitySubscriberContext } from './types.ts';

export function buildEntityDestinations<T extends ObjectLiteral>(
    type: `${EntityType}`,
    realmIds?: (data: T) => (string | null | undefined)[],
) : (data: T) => DomainEventDestinations {
    return (data) => {
        const destinations : DomainEventDestinations = [
            { channel: (id) => buildEntityChannelName(type, id) },
        ];

        if (realmIds) {
            const items = realmIds(data);
            const seen = new Set<string>();
            for (const realmId of items) {
                if (realmId && !seen.has(realmId)) {
                    seen.add(realmId);
                    destinations.push({
                        channel: (id) => buildEntityChannelName(type, id),
                        namespace: buildEntityNamespaceName(realmId),
                    });
                }
            }
        }

        return destinations;
    };
}

export class EntitySubscriber<T extends ObjectLiteral> implements EntitySubscriberInterface<T> {
    protected ctx : EntitySubscriberContext<T>;

    protected publisher? : IDomainEventPublisher;

    constructor(ctx: EntitySubscriberContext<T>) {
        this.ctx = ctx;
        this.publisher = ctx.publisher;
    }

    setPublisher(publisher: IDomainEventPublisher) : void {
        this.publisher = publisher;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    listenTo() : Function | string {
        return this.ctx.target;
    }

    async afterInsert(event: InsertEvent<T>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (this.ctx.cache && this.ctx.cache.onInsert) {
            await this.dropCacheKeys(event.connection, event.entity);
        }

        await this.publish(EntityDefaultEventName.CREATED, event.entity);
    }

    async afterUpdate(event: UpdateEvent<T>): Promise<any> {
        if (!event.entity) {
            return;
        }

        await this.dropCacheKeys(event.connection, event.entity as T);

        await this.publish(EntityDefaultEventName.UPDATED, event.entity as T);
    }

    async afterRemove(event: RemoveEvent<T>): Promise<any> {
        if (!event.entity) {
            return;
        }

        await this.dropCacheKeys(event.connection, event.entity);

        await this.publish(EntityDefaultEventName.DELETED, event.entity);
    }

    protected async dropCacheKeys(connection: DataSource, data: T) : Promise<void> {
        if (!this.ctx.cache || !connection.queryResultCache) {
            return;
        }

        await connection.queryResultCache.remove(this.ctx.cache.keys(data));
    }

    protected async publish(event: `${EntityDefaultEventName}`, data: T) : Promise<void> {
        if (!this.publisher) {
            return;
        }

        await this.publisher.safePublish({
            content: {
                type: this.ctx.type,
                event,
                data,
            },
            destinations: this.ctx.destinations(data),
        });
    }
}
