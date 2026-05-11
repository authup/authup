/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { RobotRole } from '@authup/core-kit';
import type { ActorContext, EntityRepositoryFindManyResult, IEntityRepository  } from '@authup/server-kit';

export interface IRobotRoleRepository extends IEntityRepository<RobotRole> {
}

export interface IRobotRoleService {
    getMany(query: Record<string, any>, actor: ActorContext): Promise<EntityRepositoryFindManyResult<RobotRole>>;
    getOne(id: string, actor: ActorContext): Promise<RobotRole>;
    create(data: Record<string, any>, actor: ActorContext): Promise<RobotRole>;
    delete(id: string, actor: ActorContext): Promise<RobotRole>;
}
