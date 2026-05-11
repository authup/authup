/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ClientPermission } from '@authup/core-kit';
import type { ActorContext, EntityRepositoryFindManyResult, IEntityRepository  } from '@authup/server-kit';

export interface IClientPermissionRepository extends IEntityRepository<ClientPermission> {
}

export interface IClientPermissionService {
    getMany(query: Record<string, any>, actor: ActorContext): Promise<EntityRepositoryFindManyResult<ClientPermission>>;
    getOne(id: string, actor: ActorContext): Promise<ClientPermission>;
    create(data: Record<string, any>, actor: ActorContext): Promise<ClientPermission>;
    update(id: string, data: Record<string, any>, actor: ActorContext): Promise<ClientPermission>;
    delete(id: string, actor: ActorContext): Promise<ClientPermission>;
}
