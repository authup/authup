/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '@authup/core-kit';
import type { ActorContext } from '../actor/types.ts';
import type { EntityRepositoryFindManyResult, IEntityRepository } from '../types.ts';

export interface IClientRepository extends IEntityRepository<Client> {
    checkUniqueness(data: Partial<Client>, existing?: Client): Promise<void>;

    findOneWithSecret(where: Record<string, any>): Promise<Client | null>;
}

export interface IClientService {
    getMany(query: Record<string, any>, actor: ActorContext): Promise<EntityRepositoryFindManyResult<Client>>;
    getOne(idOrName: string, actor: ActorContext, realmId?: string): Promise<Client>;
    create(data: Record<string, any>, actor: ActorContext): Promise<Client>;
    update(idOrName: string, data: Record<string, any>, actor: ActorContext): Promise<Client>;
    save(
        idOrName: string | undefined,
        data: Record<string, any>,
        actor: ActorContext,
        options?: { updateOnly?: boolean },
    ): Promise<{
        entity: Client,
        created: boolean 
    }>;
    delete(id: string, actor: ActorContext): Promise<Client>;
}
