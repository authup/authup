/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PermissionPolicy } from '@authup/core-kit';
import type { ActorContext } from '../actor/types.ts';
import type { EntityRepositoryFindManyResult, IEntityRepository } from '../types.ts';

export interface IPermissionPolicyRepository extends IEntityRepository<PermissionPolicy> {
}

export interface IPermissionPolicyService {
    getMany(query: Record<string, any>, actor: ActorContext): Promise<EntityRepositoryFindManyResult<PermissionPolicy>>;
    getOne(id: string, actor: ActorContext): Promise<PermissionPolicy>;
    create(data: Record<string, any>, actor: ActorContext): Promise<PermissionPolicy>;
    delete(id: string, actor: ActorContext): Promise<PermissionPolicy>;
}
