/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Role } from '@authup/core-kit';
import type { PermissionPolicyBinding } from '@authup/access';
import type { IRoleRepository } from '../../../../src/core/entities/role/types.ts';
import { FakeEntityRepository } from './fake-repository.ts';

export class FakeRoleRepository extends FakeEntityRepository<Role> implements IRoleRepository {
    async checkUniqueness(): Promise<void> {
        // no-op
    }

    async getBoundPermissions(): Promise<PermissionPolicyBinding[]> {
        return [];
    }

    async getBoundPermissionsForMany(): Promise<PermissionPolicyBinding[]> {
        return [];
    }
}
