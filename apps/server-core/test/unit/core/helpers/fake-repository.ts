/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { isUUID } from '@authup/kit';
import type { ObjectLiteral } from '@authup/kit';
import type {
    EntityRepositoryFindManyResult,
    IEntityRepository,
} from '../../../../src/core/entities/types.ts';

export class FakeEntityRepository<T extends ObjectLiteral> implements IEntityRepository<T> {
    protected store: T[] = [];

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async findMany(query: Record<string, any>): Promise<EntityRepositoryFindManyResult<T>> {
        return {
            data: [...this.store],
            meta: {
                total: this.store.length,
                offset: 0,
                limit: 50,
            },
        };
    }

    async findOneById(id: string): Promise<T | null> {
        return this.store.find((e) => e.id === id) ?? null;
    }

    async findOneByName(name: string, realm?: string): Promise<T | null> {
        return this.store.find((e) => {
            if (e.name !== name) return false;
            if (realm !== undefined && e.realm_id !== realm) return false;
            return true;
        }) ?? null;
    }

    async findOneByIdOrName(idOrName: string, realm?: string): Promise<T | null> {
        if (isUUID(idOrName)) {
            return this.findOneById(idOrName);
        }
        return this.findOneByName(idOrName, realm);
    }

    async findManyBy(where: Record<string, any>): Promise<T[]> {
        return this.store.filter((e) => this.matchesWhere(e, where));
    }

    async findOneBy(where: Record<string, any>): Promise<T | null> {
        return this.store.find((e) => this.matchesWhere(e, where)) ?? null;
    }

    create(data: Partial<T>): T {
        return {
            id: randomUUID(),
            ...data 
        } as T;
    }

    merge(entity: T, data: Partial<T>): T {
        Object.assign(entity, data);
        return entity;
    }

    async save(entity: T): Promise<T> {
        const idx = this.store.findIndex((e) => e.id === entity.id);
        if (idx >= 0) {
            this.store[idx] = entity;
        } else {
            this.store.push(entity);
        }
        return entity;
    }

    async remove(entity: T): Promise<void> {
        const idx = this.store.findIndex((e) => e.id === entity.id);
        if (idx >= 0) {
            this.store.splice(idx, 1);
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async validateJoinColumns(data: Partial<T>): Promise<void> {
        // no-op in fake
    }

    async checkUniqueness(): Promise<void> {
        // no-op in fake
    }

    getAll(): T[] {
        return [...this.store];
    }

    clear() {
        this.store = [];
    }

    seed(entities: Partial<T>[]): T[];

    seed(entity: Partial<T>): T;

    seed(input: Partial<T> | Partial<T>[]): T | T[] {
        if (Array.isArray(input)) {
            const created = input.map((entity) => this.create(entity));
            this.store.push(...created);
            return created;
        }

        const created = this.create(input);
        this.store.push(created);
        return created;
    }

    private matchesWhere(entity: T, where: Record<string, any>): boolean {
        return Object.entries(where).every(([key, value]) => entity[key] === value);
    }
}
