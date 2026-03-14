/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { User } from '@authup/core-kit';
import type { ActorContext } from '../actor/types.ts';
import type { EntityRepositoryFindManyResult, IEntityRepository } from '../types.ts';

export interface IUserRepository extends IEntityRepository<User> {
    checkUniqueness(data: Partial<User>, existing?: User): Promise<void>;

    findOne(id: string, query?: Record<string, any>, realm?: string): Promise<User | null>;
}

export interface IUserService {
    getMany(query: Record<string, any>, actor: ActorContext): Promise<EntityRepositoryFindManyResult<User>>;
    getOne(idOrName: string, actor: ActorContext, query?: Record<string, any>, realmId?: string): Promise<User>;
    create(data: Record<string, any>, actor: ActorContext): Promise<User>;
    update(idOrName: string, data: Record<string, any>, actor: ActorContext): Promise<User>;
    save(
        idOrName: string | undefined,
        data: Record<string, any>,
        actor: ActorContext,
        options?: { updateOnly?: boolean },
    ): Promise<{ entity: User, created: boolean }>;
    delete(id: string, actor: ActorContext): Promise<User>;
}
