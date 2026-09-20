/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Path } from '@authup/core-kit';
import type { ActorContext, EntityRepositoryFindManyResult, IEntityRepository } from '@authup/server-kit';

export interface IPathRepository extends IEntityRepository<Path> {
    checkUniqueness(data: Partial<Path>, existing?: Path): Promise<void>;

    /** Every folder below `entity` (prefix `entity.path + '/'`) in its realm. */
    findDescendants(entity: Path): Promise<Path[]>;

    /** The #3526 seam: the callback's repository is bound to one transaction. */
    transaction<R>(fn: (repository: IPathRepository) => Promise<R>): Promise<R>;
}

export type PathReadOptions = {
    /**
     * Route-scoped realm (nested `/realms/:realmId/paths` mount),
     * appended onto the decoded query IR as a non-displaceable
     * `realmId` condition.
     */
    realmId?: string,
};

export interface IPathService {
    getMany(query: Record<string, any>, actor: ActorContext, options?: PathReadOptions): Promise<EntityRepositoryFindManyResult<Path>>;
    getOne(id: string, actor: ActorContext, realmKey?: string): Promise<Path>;
    create(data: Record<string, any>, actor: ActorContext): Promise<Path>;
    update(id: string, data: Record<string, any>, actor: ActorContext, realmKey?: string): Promise<Path>;
    delete(id: string, actor: ActorContext, realmKey?: string): Promise<Path>;
}
