/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Realm, Role } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import type { PermissionPolicyBinding } from '@authup/access';
import type { Repository } from 'typeorm';
import type { IRoleRepository } from '../../../../../core/index.ts';
import {
    RoleEntity,
    RolePermissionEntity,
} from '../../../../../adapters/database/domains/index.ts';
import { loadBoundPermissions } from '../bindings.ts';
import type { IQueryCache } from '../../cache/index.ts';
import { EntityRepositoryAdapter } from '../entity/index.ts';
import { RealmRepositoryAdapter } from '../realm/repository.ts';

export type RoleRepositoryAdapterContext = {
    repository: Repository<Role>,
    realmRepository: Repository<Realm>,
};

export class RoleRepositoryAdapter extends EntityRepositoryAdapter<Role> implements IRoleRepository {
    protected cache: IQueryCache;

    constructor(ctx: RoleRepositoryAdapterContext, cache: IQueryCache) {
        super(ctx.repository, {
            alias: 'role',
            target: RoleEntity,
            entity: 'role',
            // the per-row realm gate reads `realmId` (issue #3574)
            realmScope: {},
            realmRepository: new RealmRepositoryAdapter(ctx.realmRepository, cache),
        });

        this.cache = cache;
    }

    async getBoundPermissions(entity: string | Role): Promise<PermissionPolicyBinding[]> {
        const id = typeof entity === 'string' ? entity : entity.id;

        return loadBoundPermissions({
            manager: this.repository.manager,
            cache: this.cache,
            junctionTarget: RolePermissionEntity,
            schema: EntityType.ROLE_PERMISSION,
            ownerColumn: 'roleId',
            ownerId: id,
        });
    }

    async getBoundPermissionsForMany(entities: (string | Role)[]): Promise<PermissionPolicyBinding[]> {
        const results = await Promise.all(entities.map((entity) => this.getBoundPermissions(entity)));

        return results.flat();
    }
}
