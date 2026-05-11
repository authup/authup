/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Robot, Role } from '@authup/core-kit';
import type { PermissionPolicyBinding } from '@authup/access';
import { FakeEntityRepository } from '@authup/server-test-kit';
import type { IRobotRepository } from '../../../../../src/core/entities/robot/types.ts';

export class FakeRobotRepository extends FakeEntityRepository<Robot> implements IRobotRepository {
    async checkUniqueness(): Promise<void> {
        // no-op
    }

    async findOne(id: string, _query?: Record<string, any>, realm?: string): Promise<Robot | null> {
        return this.findOneByIdOrName(id, realm);
    }

    async findOneWithSecret(where: Record<string, any>): Promise<Robot | null> {
        return this.findOneBy(where);
    }

    async getBoundRoles(_entity: string | Robot): Promise<Role[]> {
        return [];
    }

    async getBoundPermissions(_entity: string | Robot): Promise<PermissionPolicyBinding[]> {
        return [];
    }
}
