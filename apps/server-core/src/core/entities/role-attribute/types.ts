/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { RoleAttribute } from '@authup/core-kit';
import type { ActorContext } from '../actor/types.ts';
import type { EntityRepositoryFindManyResult, IEntityRepository } from '../types.ts';

export interface IRoleAttributeRepository extends IEntityRepository<RoleAttribute> {

}

export interface IRoleAttributeService {
    getMany(query: Record<string, any>, actor: ActorContext): Promise<EntityRepositoryFindManyResult<RoleAttribute>>;
    getOne(id: string, actor: ActorContext): Promise<RoleAttribute>;
    create(data: Record<string, any>, actor: ActorContext): Promise<RoleAttribute>;
    update(id: string, data: Record<string, any>, actor: ActorContext): Promise<RoleAttribute>;
    delete(id: string, actor: ActorContext): Promise<RoleAttribute>;
}
