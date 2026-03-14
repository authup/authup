/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { UserPermission } from '@authup/core-kit';
import type { ActorContext } from '../actor/types.ts';
import type { EntityRepositoryFindManyResult, IEntityRepository } from '../types.ts';

export interface IUserPermissionRepository extends IEntityRepository<UserPermission> {
}

export interface IUserPermissionService {
    getMany(query: Record<string, any>, actor: ActorContext): Promise<EntityRepositoryFindManyResult<UserPermission>>;
    getOne(id: string, actor: ActorContext): Promise<UserPermission>;
    create(data: Record<string, any>, actor: ActorContext): Promise<UserPermission>;
    delete(id: string, actor: ActorContext): Promise<UserPermission>;
}
