/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { UserAuthenticator, UserAuthenticatorKind } from '@authup/core-kit';
import type { EntityRepositoryFindManyResult } from '@authup/server-kit';
import type {
    IUserAuthenticatorRepository,
    UserAuthenticatorFindManyOptions,
    UserAuthenticatorSecretsFilter,
} from '../../../../../src/core/index.ts';

export class FakeUserAuthenticatorRepository implements IUserAuthenticatorRepository {
    public removeCalls: UserAuthenticator[] = [];

    private entities = new Map<string, UserAuthenticator>();

    seed(input: Partial<UserAuthenticator>): UserAuthenticator {
        const entity = {
            id: input.id || randomUUID(),
            name: null,
            secret: null,
            parameters: null,
            codes: null,
            confirmed: false,
            last_used_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...input,
        } as UserAuthenticator;
        this.entities.set(entity.id, entity);
        return entity;
    }

    getAll(): UserAuthenticator[] {
        return [...this.entities.values()];
    }

    create(data: Partial<UserAuthenticator>): UserAuthenticator {
        return {
            confirmed: false,
            name: null,
            secret: null,
            parameters: null,
            codes: null,
            last_used_at: null,
            ...data,
        } as UserAuthenticator;
    }

    async save(entity: UserAuthenticator): Promise<UserAuthenticator> {
        // mirror TypeORM: only provided properties are written — a row
        // loaded without its select:false columns must not clobber them. The
        // optimistic-lock version is bumped on every persist (the DB conflict
        // path is exercised by integration tests, not modeled here).
        const existing = entity.id ? this.entities.get(entity.id) : undefined;
        if (existing) {
            const merged = {
                ...existing,
                ...entity,
                version: (existing.version ?? 1) + 1,
            } as UserAuthenticator;
            this.entities.set(merged.id, merged);
            return merged;
        }

        const created = { ...entity, version: entity.version ?? 1 } as UserAuthenticator;
        return this.seed(created);
    }

    async remove(entity: UserAuthenticator): Promise<void> {
        this.removeCalls.push(entity);
        this.entities.delete(entity.id);
    }

    async removeAllByUser(userId: string, kind: `${UserAuthenticatorKind}`): Promise<void> {
        for (const entity of this.entities.values()) {
            if (entity.user_id === userId && entity.kind === kind) {
                this.entities.delete(entity.id);
            }
        }
    }

    protected sanitize(entity: UserAuthenticator): UserAuthenticator {
        // mirror the adapter's select:false semantics — plain reads never
        // carry the secret material (the columns are ABSENT, not null,
        // so a later save() leaves them untouched).
        const output : Partial<UserAuthenticator> = { ...entity };
        delete output.secret;
        delete output.codes;
        return output as UserAuthenticator;
    }

    async findOneById(id: string): Promise<UserAuthenticator | null> {
        const entity = this.entities.get(id);
        return entity ? this.sanitize(entity) : null;
    }

    async findOneWithSecretsById(id: string): Promise<UserAuthenticator | null> {
        const entity = this.entities.get(id);
        return entity ? { ...entity } : null;
    }

    async findAllByUser(userId: string): Promise<UserAuthenticator[]> {
        return this.getAll()
            .filter((entity) => entity.user_id === userId)
            .map((entity) => this.sanitize(entity));
    }

    async findAllWithSecretsByUser(
        userId: string,
        filter: UserAuthenticatorSecretsFilter = {},
    ): Promise<UserAuthenticator[]> {
        return this.getAll().filter((entity) => {
            if (entity.user_id !== userId) return false;
            if (filter.kind && entity.kind !== filter.kind) return false;
            if (typeof filter.confirmed !== 'undefined' && entity.confirmed !== filter.confirmed) return false;
            return true;
        }).map((entity) => ({ ...entity }));
    }

    async hasConfirmedByUser(userId: string): Promise<boolean> {
        return this.getAll().some((entity) => entity.user_id === userId && entity.confirmed);
    }

    async findMany(
        query: Record<string, any>,
        options: UserAuthenticatorFindManyOptions = {},
    ): Promise<EntityRepositoryFindManyResult<UserAuthenticator>> {
        let data = this.getAll();
        if (options.owner) {
            data = data.filter((entity) => entity.user_id === options.owner!.userId);
        }

        data = data.map((entity) => this.sanitize(entity));

        return {
            data,
            meta: {
                total: data.length,
                limit: 50,
                offset: 0,
            },
        };
    }
}
