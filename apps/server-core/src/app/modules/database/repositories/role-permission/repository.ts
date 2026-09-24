/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { RolePermission } from '@authup/core-kit';
import type { Repository } from 'typeorm';
import type { IRolePermissionRepository } from '../../../../../core/index.ts';
import { RolePermissionEntity } from '../../../../../adapters/database/domains/index.ts';
import { EntityRepositoryAdapter } from '../entity/index.ts';

export class RolePermissionRepositoryAdapter extends EntityRepositoryAdapter<RolePermission> implements IRolePermissionRepository {
    constructor(repository: Repository<RolePermission>) {
        super(repository, {
            alias: 'rolePermission',
            target: RolePermissionEntity,
            entity: 'role permission',
            realmScope: { column: 'roleRealmId' },
        });
    }
}
