/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ClientTokenExchangePolicy } from '@authup/core-kit';
import type { ActorContext, EntityRepositoryFindManyResult, IEntityRepository } from '@authup/server-kit';

export interface IClientTokenExchangePolicyRepository extends IEntityRepository<ClientTokenExchangePolicy> {
    checkUniqueness(data: Partial<ClientTokenExchangePolicy>, existing?: ClientTokenExchangePolicy): Promise<void>;
    transaction<R>(fn: (repository: IClientTokenExchangePolicyRepository) => Promise<R>): Promise<R>;
}

export interface IClientTokenExchangePolicyService {
    getMany(query: Record<string, any>, actor: ActorContext): Promise<EntityRepositoryFindManyResult<ClientTokenExchangePolicy>>;
    getOne(id: string, actor: ActorContext): Promise<ClientTokenExchangePolicy>;
    create(data: Record<string, any>, actor: ActorContext): Promise<ClientTokenExchangePolicy>;
    update(id: string, data: Record<string, any>, actor: ActorContext): Promise<ClientTokenExchangePolicy>;
    delete(id: string, actor: ActorContext): Promise<ClientTokenExchangePolicy>;
}
