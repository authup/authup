/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PermissionItem } from '@authup/kit';
import { buildRedisKeyPath } from '@authup/server-kit';
import type { DataSource, EntityManager } from 'typeorm';
import type {
    Role,
} from '@authup/core-kit';
import {
    transformPermissionRelationToPermissionItem,
} from '@authup/core-kit';
import { CachePrefix } from '../constants';
import { EARepository } from '../core';
import { RoleAttributeEntity } from '../role-attribute/entity';
import { RoleEntity } from './entity';
import { RolePermissionEntity } from '../role-permission';

export class RoleRepository extends EARepository<RoleEntity, RoleAttributeEntity> {
    constructor(instance: DataSource | EntityManager) {
        super(instance, {
            attributeProperties: (input, parent) => {
                input.role_id = parent.id;
                input.realm_id = parent.realm_id;

                return input;
            },
            entity: RoleEntity,
            entityPrimaryColumn: 'id',
            attributeEntity: RoleAttributeEntity,
            attributeForeignColumn: 'role_id',
            cachePrefix: CachePrefix.ROLE_OWNED_PERMISSIONS,
        });
    }

    async getOwnedPermissionsByMany(
        ids: Role['id'][],
    ) : Promise<PermissionItem[]> {
        const promises : Promise<PermissionItem[]>[] = [];

        for (let i = 0; i < ids.length; i++) {
            promises.push(this.getOwnedPermissions(ids[i]));
        }

        const abilities = await Promise.all(promises);

        return abilities.flat();
    }

    async getOwnedPermissions(
        id: Role['id'],
    ) : Promise<PermissionItem[]> {
        const repository = this.manager.getRepository(RolePermissionEntity);

        const entities = await repository.find({
            where: {
                role_id: id,
            },
            relations: {
                policy: true,
                permission: {
                    policy: true,
                },
            },
            cache: {
                id: buildRedisKeyPath({
                    prefix: CachePrefix.ROLE_OWNED_PERMISSIONS,
                    key: id,
                }),
                milliseconds: 60_000,
            },
        });

        return entities.map((entity) => transformPermissionRelationToPermissionItem(entity));
    }
}
