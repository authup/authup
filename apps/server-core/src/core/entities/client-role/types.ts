/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ClientRole } from '@authup/core-kit';
import type { ActorContext } from '../actor/types.ts';
import type { EntityRepositoryFindManyResult, IEntityRepository } from '../types.ts';

export interface IClientRoleRepository extends IEntityRepository<ClientRole> {
}

export interface IClientRoleService {
    getMany(query: Record<string, any>, actor: ActorContext): Promise<EntityRepositoryFindManyResult<ClientRole>>;
    getOne(id: string, actor: ActorContext): Promise<ClientRole>;
    create(data: Record<string, any>, actor: ActorContext): Promise<ClientRole>;
    delete(id: string, actor: ActorContext): Promise<ClientRole>;
}
