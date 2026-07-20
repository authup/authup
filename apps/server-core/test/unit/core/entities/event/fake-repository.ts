/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { IQuery } from '@rapiq/core';
import type { Event } from '@authup/core-kit';
import type { EntityRepositoryFindManyResult } from '@authup/server-kit';
import type {
    EventCountRecentFilter,
    EventFindManyOptions,
    IEventRepository,
} from '../../../../../src/core/index.ts';

export class FakeEventRepository implements IEventRepository {
    public rows: Event[] = [];

    public saveCalls: Event[] = [];

    public saveError: Error | null = null;

    seed(data: Partial<Event>): Event {
        const entity = this.create(data);
        this.rows.push(entity);
        return entity;
    }

    create(data: Partial<Event>): Event {
        return {
            id: randomUUID(),
            refType: null,
            refId: null,
            clientId: null,
            actorType: null,
            actorId: null,
            actorName: null,
            requestPath: null,
            requestMethod: null,
            requestIpAddress: null,
            requestUserAgent: null,
            realmId: null,
            data: null,
            expiring: false,
            expiresAt: null,
            createdAt: new Date().toISOString(),
            ...data,
        } as Event;
    }

    async save(entity: Event): Promise<Event> {
        if (this.saveError) {
            throw this.saveError;
        }

        this.saveCalls.push(entity);

        const index = this.rows.findIndex((row) => row.id === entity.id);
        if (index === -1) {
            this.rows.push(entity);
        } else {
            this.rows[index] = entity;
        }

        return entity;
    }

    async findOneById(id: string): Promise<Event | null> {
        return this.rows.find((row) => row.id === id) ?? null;
    }

    async findMany(
        query: IQuery,
        options: EventFindManyOptions = {},
    ): Promise<EntityRepositoryFindManyResult<Event>> {
        let data = [...this.rows];

        if (options.owner) {
            const { owner } = options;
            data = data.filter((row) => row.actorId === owner.actorId &&
                row.actorType === owner.actorType);
        }
        if (options.realmId) {
            data = data.filter((row) => row.realmId === options.realmId);
        }
        if (options.visibility) {
            const { owner, realmIds } = options.visibility;
            data = data.filter((row) => realmIds.includes(row.realmId) ||
                (!!owner && row.actorId === owner.actorId && row.actorType === owner.actorType));
        }

        return {
            data,
            meta: {
                total: data.length,
                limit: 50,
                offset: 0,
            },
        };
    }

    async countRecent(filter: EventCountRecentFilter): Promise<number> {
        const since = new Date(filter.since).getTime();

        return this.rows.filter((row) => {
            if (row.name !== filter.name) {
                return false;
            }
            if (new Date(row.createdAt).getTime() <= since) {
                return false;
            }
            if (filter.actorName && row.actorName !== filter.actorName) {
                return false;
            }
            if (filter.requestIpAddress && row.requestIpAddress !== filter.requestIpAddress) {
                return false;
            }
            if (typeof filter.realmId !== 'undefined') {
                if (filter.realmId === null) {
                    if (row.realmId !== null) {
                        return false;
                    }
                } else if (row.realmId !== filter.realmId) {
                    return false;
                }
            }

            return true;
        }).length;
    }

    async deleteExpired(now: string): Promise<number> {
        const nowTime = new Date(now).getTime();
        const before = this.rows.length;

        this.rows = this.rows.filter((row) => !row.expiring ||
            row.expiresAt === null ||
            new Date(row.expiresAt).getTime() >= nowTime);

        return before - this.rows.length;
    }
}
