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
                    'refType',
                    'refId',
                    'clientId',
                    'actorType',
                    'actorId',
                    'actorName',
                    'requestPath',
                    'requestMethod',
                    'requestIpAddress',
                    'requestUserAgent',
                    'realmId',
                    'data',
                    'expiring',
                    'expiresAt',
                    'createdAt',
                ],
            },
            filters: {
                allowed: [
                    'id',
                    'scope',
                    'name',
                    'refType',
                    'refId',
                    'clientId',
                    'actorType',
                    'actorId',
                    'actorName',
                    'requestIpAddress',
                    'realmId',
                    'expiring',
                    'createdAt',
                ],
            },
            sort: { allowed: ['createdAt'] },
            pagination: { maxLimit: 50 },
        });

        applyRealmScopeSelect(qb, 'event', ['actorId', 'actorType']);

        if (options.owner) {
            // mandatory constraint — not overridable by a rapiq filter
            qb.andWhere('event.actorId = :ownerActorId AND event.actorType = :ownerActorType', {
                ownerActorId: options.owner.actorId,
                ownerActorType: options.owner.actorType,
            });
        }

        if (options.realmId) {
            qb.andWhere('event.realmId = :routeRealmId', { routeRealmId: options.realmId });
        }

        if (options.visibility) {
            const constraints: string[] = [];
            const parameters: Record<string, unknown> = {};
            const realmIds = options.visibility.realmIds
                .filter((realmId): realmId is string => realmId !== null);

            if (realmIds.length > 0) {
                constraints.push('event.realmId IN (:...visibleRealmIds)');
                parameters.visibleRealmIds = realmIds;
            }
            if (options.visibility.realmIds.includes(null)) {
                constraints.push('event.realmId IS NULL');
            }
            if (options.visibility.owner) {
                constraints.push('(event.actorId = :visibleActorId AND event.actorType = :visibleActorType)');
                parameters.visibleActorId = options.visibility.owner.actorId;
                parameters.visibleActorType = options.visibility.owner.actorType;
            }

            qb.andWhere(`(${constraints.length > 0 ? constraints.join(' OR ') : '1 = 0'})`, parameters);
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
            .andWhere('event.createdAt > :since', { since: new Date(filter.since) });

        if (filter.actorName) {
            qb.andWhere('event.actorName = :actorName', { actorName: filter.actorName });
        }

        if (filter.requestIpAddress) {
            qb.andWhere('event.requestIpAddress = :requestIpAddress', { requestIpAddress: filter.requestIpAddress });
        }

        if (typeof filter.realmId !== 'undefined') {
            if (filter.realmId === null) {
                qb.andWhere('event.realmId IS NULL');
            } else {
                qb.andWhere('event.realmId = :realmId', { realmId: filter.realmId });
            }
        }

        return qb.getCount();
    }

    async deleteExpired(now: string): Promise<number> {
        const result = await this.repository.delete({
            expiring: true,
            expiresAt: LessThan(now),
        });

        return result.affected ?? 0;
    }
}
