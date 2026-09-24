/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { UserPermission } from '@authup/core-kit';
import type { Repository } from 'typeorm';
import type { IUserPermissionRepository } from '../../../../../core/index.ts';
import { UserPermissionEntity } from '../../../../../adapters/database/domains/index.ts';
import { EntityRepositoryAdapter } from '../entity/index.ts';

export class UserPermissionRepositoryAdapter extends EntityRepositoryAdapter<UserPermission> implements IUserPermissionRepository {
    constructor(repository: Repository<UserPermission>) {
        super(repository, {
            alias: 'userPermission',
            target: UserPermissionEntity,
            entity: 'user permission',
            realmScope: { column: 'userRealmId' },
        });
    }
}
