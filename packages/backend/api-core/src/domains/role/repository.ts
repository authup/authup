/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DataSource, EntityManager, In, InstanceChecker, Repository,
} from 'typeorm';
import {
    PermissionMeta,
    Role,
    buildPermissionMetaFromRelation,
} from '@authelion/common';
import { buildKeyPath } from 'redis-extension';
import { RoleEntity } from './entity';
import { RolePermissionEntity } from '../role-permission';
import { CachePrefix } from '../../constants';

export class RoleRepository extends Repository<RoleEntity> {
    constructor(instance: DataSource | EntityManager) {
        super(RoleEntity, InstanceChecker.isDataSource(instance) ? instance.manager : instance);
    }

    async getOwnedPermissionsByMany(
        ids: Role['id'][],
    ) : Promise<PermissionMeta[]> {
        const permissions = [];

        for (let i = 0; i < ids.length; i++) {
            permissions.push(...await this.getOwnedPermissions(ids[i]));
        }

        return permissions;
    }

    async getOwnedPermissions(
        id: Role['id'],
    ) : Promise<PermissionMeta[]> {
        const repository = this.manager.getRepository(RolePermissionEntity);

        const entities = await repository.find({
            where: {
                role_id: id,
            },
            cache: {
                id: buildKeyPath({
                    prefix: CachePrefix.ROLE_OWNED_PERMISSIONS,
                    id,
                }),
                milliseconds: 60.000,
            },
        });

        const result : PermissionMeta[] = [];
        for (let i = 0; i < entities.length; i++) {
            result.push(buildPermissionMetaFromRelation(entities[i]));
        }

        return result;
    }
}
