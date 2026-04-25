/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Robot, Role } from '@authup/core-kit';
import type { PermissionPolicyBinding } from '@authup/access';
import type { ActorContext } from '../actor/types.ts';
import type { EntityRepositoryFindManyResult, IEntityRepository } from '../types.ts';

export interface IRobotRepository extends IEntityRepository<Robot> {
    checkUniqueness(data: Partial<Robot>, existing?: Robot): Promise<void>;

    findOneWithSecret(where: Record<string, any>): Promise<Robot | null>;

    getBoundRoles(entity: string | Robot): Promise<Role[]>;

    getBoundPermissions(entity: string | Robot): Promise<PermissionPolicyBinding[]>;
}

export interface IRobotService {
    getMany(query: Record<string, any>, actor: ActorContext): Promise<EntityRepositoryFindManyResult<Robot>>;
    getOne(idOrName: string, actor: ActorContext, realmId?: string): Promise<Robot>;
    create(data: Record<string, any>, actor: ActorContext): Promise<Robot>;
    update(idOrName: string, data: Record<string, any>, actor: ActorContext): Promise<Robot>;
    save(
        idOrName: string | undefined,
        data: Record<string, any>,
        actor: ActorContext,
        options?: { updateOnly?: boolean },
    ): Promise<{
        entity: Robot,
        created: boolean 
    }>;
    delete(id: string, actor: ActorContext): Promise<Robot>;
}
