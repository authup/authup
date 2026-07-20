/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Role, User } from '@authup/core-kit';
import type { IQuery } from '@rapiq/core';
import type { PermissionPolicyBinding } from '@authup/access';
import { FakeEntityRepository } from '@authup/server-test-kit';
import type { IUserRepository } from '../../../../../src/core/entities/user/types.ts';

export class FakeUserRepository extends FakeEntityRepository<User> implements IUserRepository {
    async checkUniqueness(): Promise<void> {
        // no-op
    }

    async findOne(id: string, _query?: IQuery, realm?: string): Promise<User | null> {
        return this.findOneByIdOrName(id, realm);
    }

    async findOneByWithEmail(where: Record<string, any>): Promise<User | null> {
        return this.findOneBy(where);
    }

    async getBoundRoles(_entity: string | User): Promise<Role[]> {
        return [];
    }

    async getBoundPermissions(_entity: string | User): Promise<PermissionPolicyBinding[]> {
        return [];
    }
}
