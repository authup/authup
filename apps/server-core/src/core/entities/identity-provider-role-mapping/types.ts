/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProviderRoleMapping } from '@authup/core-kit';
import type { ActorContext } from '../actor/types.ts';
import type { EntityRepositoryFindManyResult, IEntityRepository } from '../types.ts';

export interface IIdentityProviderRoleMappingRepository extends IEntityRepository<IdentityProviderRoleMapping> {

}

export interface IIdentityProviderRoleMappingService {
    getMany(query: Record<string, any>, actor: ActorContext): Promise<EntityRepositoryFindManyResult<IdentityProviderRoleMapping>>;
    getOne(id: string, actor: ActorContext): Promise<IdentityProviderRoleMapping>;
    create(data: Record<string, any>, actor: ActorContext): Promise<IdentityProviderRoleMapping>;
    update(id: string, data: Record<string, any>, actor: ActorContext): Promise<IdentityProviderRoleMapping>;
    delete(id: string, actor: ActorContext): Promise<IdentityProviderRoleMapping>;
}
