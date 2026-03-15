/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { UserRole } from '@authup/core-kit';
import type { ActorContext } from '../actor/types.ts';
import type { EntityRepositoryFindManyResult, IEntityRepository } from '../types.ts';

export interface IUserRoleRepository extends IEntityRepository<UserRole> {
}

export interface IUserRoleService {
    getMany(query: Record<string, any>, actor: ActorContext): Promise<EntityRepositoryFindManyResult<UserRole>>;
    getOne(id: string, actor: ActorContext): Promise<UserRole>;
    create(data: Record<string, any>, actor: ActorContext): Promise<UserRole>;
    delete(id: string, actor: ActorContext): Promise<UserRole>;
}
