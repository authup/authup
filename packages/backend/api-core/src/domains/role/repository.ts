/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EntityRepository, In, Repository } from 'typeorm';
import {
    PermissionMeta,
    Role,
    buildPermissionMetaFromRelation,
} from '@authelion/common';
import { RoleEntity } from './entity';
import { RolePermissionEntity } from '../role-permission';

@EntityRepository(RoleEntity)
export class RoleRepository extends Repository<RoleEntity> {
    async getOwnedPermissions(
        roleId: Role['id'] | Role['id'][],
    ) : Promise<PermissionMeta[]> {
        if (!Array.isArray(roleId)) {
            roleId = [roleId];
        }

        if (roleId.length === 0) {
            return [];
        }

        const repository = this.manager.getRepository(RolePermissionEntity);

        const entities = await repository.findBy({
            role_id: In(roleId),
        });

        const result : PermissionMeta[] = [];
        for (let i = 0; i < entities.length; i++) {
            result.push(buildPermissionMetaFromRelation(entities[i]));
        }

        return result;
    }
}
