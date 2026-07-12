/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Event } from '@authup/core-kit';
import type { Repository } from 'typeorm';
import { LessThan } from 'typeorm';
import { applyQuery } from 'typeorm-extension';
import type { EntityRepositoryFindManyResult } from '@authup/server-kit';
import type {
    EventCountRecentFilter,
    EventFindManyOptions,
    IEventRepository,
} from '../../../../../core/index.ts';
import { applyRealmScopeSelect } from '../helpers.ts';

export class EventRepositoryAdapter implements IEventRepository {
    private readonly repository: Repository<Event>;

    constructor(repository: Repository<Event>) {
        this.repository = repository;
    }

    create(data: Partial<Event>): Event {
        return this.repository.create(data);
    }

    async save(entity: Event): Promise<Event> {
        return this.repository.save(entity);
    }

    async findOneById(id: string): Promise<Event | null> {
        return this.repository.findOneBy({ id });
    }

    async findMany(
        query: Record<string, any>,
        options: EventFindManyOptions = {},
    ): Promise<EntityRepositoryFindManyResult<Event>> {
        const qb = this.repository.createQueryBuilder('event');

        const { pagination } = applyQuery(qb, query, {
            defaultAlias: 'event',
            fields: {
                allowed: [
                    'id',
                    'scope',
                    'name',
                    'ref_type',
                    'ref_id',
                    'client_id',
                    'actor_type',
                    'actor_id',
                    'actor_name',
                    'request_path',
                    'request_method',
                    'request_ip_address',
                    'request_user_agent',
                    'realm_id',
                    'data',
                    'expiring',
                    'expires_at',
                    'created_at',
                ],
            },
            filters: {
                allowed: [
                    'id',
                    'scope',
                    'name',
                    'ref_type',
                    'ref_id',
                    'client_id',
                    'actor_type',
                    'actor_id',
                    'actor_name',
                    'request_ip_address',
                    'realm_id',
                    'expiring',
                    'created_at',
                ],
            },
            sort: { allowed: ['created_at'] },
            pagination: { maxLimit: 50 },
        });

        applyRealmScopeSelect(qb, 'event', ['actor_id', 'actor_type']);

        if (options.owner) {
            // mandatory constraint — not overridable by a rapiq filter
            qb.andWhere('event.actor_id = :ownerActorId AND event.actor_type = :ownerActorType', {
                ownerActorId: options.owner.actorId,
                ownerActorType: options.owner.actorType,
            });
        }

        const [entities, total] = await qb.getManyAndCount();

        return {
            data: entities,
            meta: {
                total,
                ...pagination,
            },
        };
    }

    async countRecent(filter: EventCountRecentFilter): Promise<number> {
        const qb = this.repository.createQueryBuilder('event')
            .where('event.name = :name', { name: filter.name })
            .andWhere('event.created_at > :since', { since: new Date(filter.since) });

        if (filter.actorName) {
            qb.andWhere('event.actor_name = :actorName', { actorName: filter.actorName });
        }

        if (filter.requestIpAddress) {
            qb.andWhere('event.request_ip_address = :requestIpAddress', { requestIpAddress: filter.requestIpAddress });
        }

        if (typeof filter.realmId !== 'undefined') {
            if (filter.realmId === null) {
                qb.andWhere('event.realm_id IS NULL');
            } else {
                qb.andWhere('event.realm_id = :realmId', { realmId: filter.realmId });
            }
        }

        return qb.getCount();
    }

    async deleteExpired(now: string): Promise<number> {
        const result = await this.repository.delete({
            expiring: true,
            expires_at: LessThan(now),
        });

        return result.affected ?? 0;
    }
}
