/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Realm } from '@authup/core-kit';
import type { ActorContext } from '../actor/types.ts';
import type { EntityRepositoryFindManyResult, IEntityRepository } from '../types.ts';

export interface IRealmRepository extends IEntityRepository<Realm> {
    resolve(id: string | undefined, withFallback: true): Promise<Realm>;
    resolve(id: string | undefined, withFallback?: boolean): Promise<Realm | null>;
}

export interface IRealmService {
    getMany(query: Record<string, any>): Promise<EntityRepositoryFindManyResult<Realm>>;
    getOne(idOrName: string): Promise<Realm>;
    create(data: Record<string, any>, actor: ActorContext): Promise<Realm>;
    update(idOrName: string, data: Record<string, any>, actor: ActorContext): Promise<Realm>;
    save(
        idOrName: string | undefined,
        data: Record<string, any>,
        actor: ActorContext,
        options?: { updateOnly?: boolean },
    ): Promise<{
        entity: Realm,
        created: boolean 
    }>;
    delete(id: string, actor: ActorContext): Promise<Realm>;
}
