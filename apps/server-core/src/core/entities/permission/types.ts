/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Permission } from '@authup/core-kit';
import type { ActorContext } from '../actor/types.ts';
import type { EntityRepositoryFindManyResult, IEntityRepository } from '../types.ts';

export interface IPermissionRepository extends IEntityRepository<Permission> {
    checkUniqueness(data: Partial<Permission>, existing?: Permission): Promise<void>;

    saveWithAdminRoleAssignment(entity: Permission): Promise<Permission>;
}

export interface IPermissionService {
    getMany(query: Record<string, any>, actor: ActorContext): Promise<EntityRepositoryFindManyResult<Permission>>;
    getOne(idOrName: string, actor: ActorContext, realm?: string): Promise<Permission>;
    create(data: Record<string, any>, actor: ActorContext): Promise<Permission>;
    update(idOrName: string, data: Record<string, any>, actor: ActorContext): Promise<Permission>;
    save(
        idOrName: string | undefined,
        data: Record<string, any>,
        actor: ActorContext,
        options?: { updateOnly?: boolean },
    ): Promise<{ entity: Permission, created: boolean }>;
    delete(id: string, actor: ActorContext): Promise<Permission>;
}
