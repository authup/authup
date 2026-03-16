/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Scope } from '@authup/core-kit';
import type { ActorContext } from '../actor/types.ts';
import type { EntityRepositoryFindManyResult, IEntityRepository } from '../types.ts';

export interface IScopeRepository extends IEntityRepository<Scope> {
    checkUniqueness(data: Partial<Scope>, existing?: Scope): Promise<void>;
}

export interface IScopeService {
    getMany(query: Record<string, any>, actor: ActorContext): Promise<EntityRepositoryFindManyResult<Scope>>;
    getOne(idOrName: string, actor: ActorContext): Promise<Scope>;
    create(data: Record<string, any>, actor: ActorContext): Promise<Scope>;
    update(idOrName: string, data: Record<string, any>, actor: ActorContext): Promise<Scope>;
    save(
        idOrName: string | undefined,
        data: Record<string, any>,
        actor: ActorContext,
        options?: { updateOnly?: boolean },
    ): Promise<{ entity: Scope, created: boolean }>;
    delete(id: string, actor: ActorContext): Promise<Scope>;
}
