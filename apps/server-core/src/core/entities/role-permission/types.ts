/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { RolePermission } from '@authup/core-kit';
import type { ActorContext } from '../actor/types.ts';
import type { EntityRepositoryFindManyResult, IEntityRepository } from '../types.ts';

export interface IRolePermissionRepository extends IEntityRepository<RolePermission> {
}

export interface IRolePermissionService {
    getMany(query: Record<string, any>, actor: ActorContext): Promise<EntityRepositoryFindManyResult<RolePermission>>;
    getOne(id: string, actor: ActorContext): Promise<RolePermission>;
    create(data: Record<string, any>, actor: ActorContext): Promise<RolePermission>;
    update(id: string, data: Record<string, any>, actor: ActorContext): Promise<RolePermission>;
    delete(id: string, actor: ActorContext): Promise<RolePermission>;
}
