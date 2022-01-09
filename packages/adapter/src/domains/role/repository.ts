/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EntityRepository, In, Repository } from 'typeorm';
import { PermissionItem } from '@typescript-auth/core';
import { Role, RolePermission } from '@typescript-auth/domains';

@EntityRepository(Role)
export class RoleRepository extends Repository<Role> {
    async getOwnedPermissions(
        roleId: typeof Role.prototype.id | typeof Role.prototype.id[],
    ) : Promise<PermissionItem<unknown>[]> {
        if (!Array.isArray(roleId)) {
            roleId = [roleId];
        }

        if (roleId.length === 0) {
            return [];
        }

        const repository = this.manager.getRepository(RolePermission);

        const entities = await repository.find({
            role_id: In(roleId),
        });

        const result : PermissionItem<unknown>[] = [];
        for (let i = 0; i < entities.length; i++) {
            result.push({
                id: entities[i].permission_id,
                condition: entities[i].condition,
                power: entities[i].power,
                fields: entities[i].fields,
                negation: entities[i].negation,
            });
        }

        return result;
    }
}
