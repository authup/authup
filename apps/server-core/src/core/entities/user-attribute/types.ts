/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { UserAttribute } from '@authup/core-kit';
import type { ActorContext } from '../actor/types.ts';
import type { EntityRepositoryFindManyResult, IEntityRepository } from '../types.ts';

export interface IUserAttributeRepository extends IEntityRepository<UserAttribute> {

}

export interface IUserAttributeService {
    getMany(query: Record<string, any>, actor: ActorContext): Promise<EntityRepositoryFindManyResult<UserAttribute>>;
    getOne(id: string, actor: ActorContext): Promise<UserAttribute>;
    create(data: Record<string, any>, actor: ActorContext): Promise<UserAttribute>;
    update(id: string, data: Record<string, any>, actor: ActorContext): Promise<UserAttribute>;
    delete(id: string, actor: ActorContext): Promise<UserAttribute>;
}
