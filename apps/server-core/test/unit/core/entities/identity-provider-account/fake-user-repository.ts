/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { User } from '@authup/core-kit';
import type { IUserIdentityRepository } from '../../../../../src/core/index.ts';

export class FakeUserIdentityRepository implements IUserIdentityRepository {
    private users = new Map<string, User>();

    seed(user: Partial<User>): User {
        const entity = {
            id: user.id || randomUUID(),
            ...user,
        } as User;
        this.users.set(entity.id, entity);
        return entity;
    }

    async findOneById(id: string): Promise<User | null> {
        return this.users.get(id) ?? null;
    }

    async findOneByName(): Promise<User | null> {
        return null;
    }

    async findOneByIdOrName(): Promise<User | null> {
        return null;
    }

    async findOneBy(): Promise<User | null> {
        return null;
    }

    async savePermissions(): Promise<void> {
        // unused by the entity service
    }

    async saveRoles(): Promise<void> {
        // unused by the entity service
    }

    async saveOneWithEA(): Promise<User> {
        throw new Error('not implemented');
    }
}
