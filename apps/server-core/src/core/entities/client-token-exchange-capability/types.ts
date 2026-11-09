/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ClientTokenExchangeCapability } from '@authup/core-kit';
import type { ActorContext, EntityRepositoryFindManyResult, IEntityRepository } from '@authup/server-kit';

export interface IClientTokenExchangeCapabilityRepository extends IEntityRepository<ClientTokenExchangeCapability> {
    checkUniqueness(data: Partial<ClientTokenExchangeCapability>, existing?: ClientTokenExchangeCapability): Promise<void>;
    transaction<R>(fn: (repository: IClientTokenExchangeCapabilityRepository) => Promise<R>): Promise<R>;
}

export interface IClientTokenExchangeCapabilityService {
    getMany(query: Record<string, any>, actor: ActorContext): Promise<EntityRepositoryFindManyResult<ClientTokenExchangeCapability>>;
    getOne(id: string, actor: ActorContext): Promise<ClientTokenExchangeCapability>;
    create(data: Record<string, any>, actor: ActorContext): Promise<ClientTokenExchangeCapability>;
    update(id: string, data: Record<string, any>, actor: ActorContext): Promise<ClientTokenExchangeCapability>;
    delete(id: string, actor: ActorContext): Promise<ClientTokenExchangeCapability>;
}
