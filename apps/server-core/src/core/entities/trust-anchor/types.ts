/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { TrustAnchor } from '@authup/core-kit';
import type { ActorContext, EntityRepositoryFindManyResult, IEntityRepository } from '@authup/server-kit';

export interface ITrustAnchorRepository extends IEntityRepository<TrustAnchor> {
    checkUniqueness(data: Partial<TrustAnchor>, existing?: TrustAnchor): Promise<void>;

    findOneByIdOrName(idOrName: string, realm?: string): Promise<TrustAnchor | null>;
}

export type TrustAnchorServiceReadOptions = {
    /**
     * Route-scoped realm (nested `/realms/:realmId/trust-anchors`
     * mount) — appended onto the decoded query IR as a
     * non-displaceable `realmId` condition.
     */
    realmId?: string,
};

export interface ITrustAnchorService {
    getMany(
        query: Record<string, any>,
        actor: ActorContext,
        options?: TrustAnchorServiceReadOptions,
    ): Promise<EntityRepositoryFindManyResult<TrustAnchor>>;
    getOne(idOrName: string, actor: ActorContext, realmId?: string): Promise<TrustAnchor>;
    create(data: Record<string, any>, actor: ActorContext): Promise<TrustAnchor>;
    update(idOrName: string, data: Record<string, any>, actor: ActorContext, realmId?: string): Promise<TrustAnchor>;
    delete(id: string, actor: ActorContext): Promise<TrustAnchor>;
}
