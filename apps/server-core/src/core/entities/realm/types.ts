/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Realm } from '@authup/core-kit';
import type { ActorContext, EntityRepositoryFindManyResult, IEntityRepository  } from '@authup/server-kit';

export interface IRealmRepository extends IEntityRepository<Realm> {
    /**
     * @throws InternalError when withFallback is set but the master realm does not exist
     * (a violated provisioning invariant, not a client fault).
     */
    resolve(id: string | undefined, withFallback: true): Promise<Realm>;
    resolve(id: string | undefined, withFallback?: boolean): Promise<Realm | null>;

    /**
     * Resolve a realm key (UUID or name) to a realm id for use in a
     * realmId predicate. A UUID key is returned as-is without existence
     * verification (binding an unknown UUID matches zero rows — fail-closed
     * by construction). A name key resolves through the canonicalizing
     * findOneByName; null means "no such realm" and the caller MUST fail
     * closed (return null / [] / throw), never drop the predicate.
     */
    resolveId(key: string): Promise<string | null>;
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
