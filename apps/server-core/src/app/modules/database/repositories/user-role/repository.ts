/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { UserRole } from '@authup/core-kit';
import type { Repository } from 'typeorm';
import type { IUserRoleRepository } from '../../../../../core/index.ts';
import { UserRoleEntity } from '../../../../../adapters/database/domains/index.ts';
import { EntityRepositoryAdapter } from '../entity/index.ts';

export class UserRoleRepositoryAdapter extends EntityRepositoryAdapter<UserRole> implements IUserRoleRepository {
    constructor(repository: Repository<UserRole>) {
        super(repository, {
            alias: 'userRole',
            target: UserRoleEntity,
            entity: 'user role',
            realmScope: { column: 'userRealmId' },
        });
    }
}
