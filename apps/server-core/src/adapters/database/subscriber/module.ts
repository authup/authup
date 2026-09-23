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
    EntityManager,
    EntitySubscriberInterface,
    InsertEvent,
    ObjectLiteral,
    QueryRunner,
    RemoveEvent,
    TransactionCommitEvent,
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

const PENDING_CACHE_KEYS = 'authupPendingCacheKeys';

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
            await this.dropCacheKeys(event.connection, event.queryRunner, event.entity);
        }

        await this.publish(EntityDefaultEventName.CREATED, event.entity, undefined, event.manager);
    }

    async afterUpdate(event: UpdateEvent<T>): Promise<any> {
        if (!event.entity) {
            return;
        }

        await this.dropCacheKeys(event.connection, event.queryRunner, event.entity as T);

        await this.publish(EntityDefaultEventName.UPDATED, event.entity as T, event.databaseEntity, event.manager);
    }

    async afterRemove(event: RemoveEvent<T>): Promise<any> {
        // remove() strips the primary key from event.entity before the
        // subscriber runs — databaseEntity is the pre-removal row and keeps
        // the id-keyed cache invalidation (and the DELETED payload) intact.
        const entity = event.databaseEntity ?? event.entity;
        if (!entity) {
            return;
        }

        await this.dropCacheKeys(event.connection, event.queryRunner, entity);

        await this.publish(EntityDefaultEventName.DELETED, entity, undefined, event.manager);
    }

    /**
     * The hooks run inside the persist transaction, so a concurrent reader may
     * repopulate a key before the write commits. The keys are therefore dropped
     * again once the outermost transaction has committed (#3599).
     */
    async afterTransactionCommit(event: TransactionCommitEvent): Promise<any> {
        if (event.queryRunner.isTransactionActive) {
            return;
        }

        const keys = event.queryRunner.data[PENDING_CACHE_KEYS] as Set<string> | undefined;
        if (!keys || !event.connection.queryResultCache) {
            return;
        }

        delete event.queryRunner.data[PENDING_CACHE_KEYS];
        await event.connection.queryResultCache.remove([...keys]);
    }

    protected async dropCacheKeys(connection: DataSource, queryRunner: QueryRunner, data: T) : Promise<void> {
        if (!this.ctx.cache || !connection.queryResultCache) {
            return;
        }

        const keys = this.ctx.cache.keys(data);
        await connection.queryResultCache.remove(keys);

        if (queryRunner.isTransactionActive) {
            const pending = (queryRunner.data[PENDING_CACHE_KEYS] ??= new Set<string>()) as Set<string>;
            for (const key of keys) {
                pending.add(key);
            }
        }
    }

    /**
     * `transaction` is the hook's `event.manager`: the after* hooks run inside
     * the persist transaction, so a handler that persists rides it (#3539).
     */
    protected async publish(
        event: `${EntityDefaultEventName}`,
        data: T,
        dataPrevious?: T,
        transaction?: EntityManager,
    ) : Promise<void> {
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
            ...(dataPrevious ? { dataPrevious } : {}),
            transaction,
        });
    }
}
