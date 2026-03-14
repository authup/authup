/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ClientScope } from '@authup/core-kit';
import type { ActorContext } from '../actor/types.ts';
import type { EntityRepositoryFindManyResult, IEntityRepository } from '../types.ts';

export interface IClientScopeRepository extends IEntityRepository<ClientScope> {
}

export interface IClientScopeService {
    getMany(query: Record<string, any>, actor: ActorContext): Promise<EntityRepositoryFindManyResult<ClientScope>>;
    getOne(id: string, actor: ActorContext): Promise<ClientScope>;
    create(data: Record<string, any>, actor: ActorContext): Promise<ClientScope>;
    delete(id: string, actor: ActorContext): Promise<ClientScope>;
}
