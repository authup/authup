/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { RobotPermission } from '@authup/core-kit';
import type { ActorContext } from '../actor/types.ts';
import type { EntityRepositoryFindManyResult, IEntityRepository } from '../types.ts';

export interface IRobotPermissionRepository extends IEntityRepository<RobotPermission> {
}

export interface IRobotPermissionService {
    getMany(query: Record<string, any>, actor: ActorContext): Promise<EntityRepositoryFindManyResult<RobotPermission>>;
    getOne(id: string, actor: ActorContext): Promise<RobotPermission>;
    create(data: Record<string, any>, actor: ActorContext): Promise<RobotPermission>;
    update(id: string, data: Record<string, any>, actor: ActorContext): Promise<RobotPermission>;
    delete(id: string, actor: ActorContext): Promise<RobotPermission>;
}
