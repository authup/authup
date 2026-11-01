/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Policy } from '@authup/core-kit';
import type { ActorContext, EntityRepositoryFindManyResult, IEntityRepository  } from '@authup/server-kit';
import type { IReadScoper } from '../../query/scope.ts';

export interface IPolicyRepository extends IEntityRepository<Policy> {
    checkUniqueness(data: Partial<Policy>, existing?: Policy): Promise<void>;

    saveWithEA(entity: Policy, data?: Record<string, any>): Promise<Policy>;

    /**
     * Every policy below the given one, at any depth, the given one excluded.
     */
    findDescendants(entity: Policy): Promise<Policy[]>;

    deleteFromTree(entity: Policy): Promise<void>;

    /**
     * Run fn with a repository whose reads lock the rows they return
     * (mysql / postgres); a plain passthrough where rows cannot be locked.
     */
    transaction<R>(fn: (repository: IPolicyRepository) => Promise<R>): Promise<R>;
}

export interface IPolicyService extends IReadScoper {
    getMany(query: Record<string, any>, actor: ActorContext): Promise<EntityRepositoryFindManyResult<Policy>>;
    getOne(idOrName: string, actor: ActorContext, realm?: string): Promise<Policy>;
    create(data: Record<string, any>, actor: ActorContext): Promise<Policy>;
    update(idOrName: string, data: Record<string, any>, actor: ActorContext): Promise<Policy>;
    save(
        idOrName: string | undefined,
        data: Record<string, any>,
        actor: ActorContext,
        options?: { updateOnly?: boolean },
    ): Promise<{
        entity: Policy,
        created: boolean,
    }>;
    delete(id: string, actor: ActorContext): Promise<Policy>;
}
