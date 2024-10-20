/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { buildRedisKeyPath } from '@authup/server-kit';
import type { DataSource, EntityManager } from 'typeorm';
import type {
    Permission,
    Role,
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

    async getBoundPermissionsForMany(
        ids: (string | Role)[],
    ) : Promise<Permission[]> {
        const promises : Promise<Permission[]>[] = [];

        for (let i = 0; i < ids.length; i++) {
            promises.push(this.getBoundPermissions(ids[i]));
        }

        const abilities = await Promise.all(promises);

        return abilities.flat();
    }

    async clearBoundPermissionsCache(entity: string | Role) {
        let id : string;
        if (typeof entity === 'string') {
            id = entity;
        } else {
            id = entity.id;
        }

        if (!this.manager.connection.queryResultCache) {
            return;
        }

        await this.manager.connection.queryResultCache.remove([buildRedisKeyPath({
            prefix: CachePrefix.ROLE_OWNED_PERMISSIONS,
            key: id,
        })]);
    }

    async getBoundPermissions(
        entity: string | Role,
    ) : Promise<Permission[]> {
        let id : string;
        if (typeof entity === 'string') {
            id = entity;
        } else {
            id = entity.id;
        }

        const repository = this.manager.getRepository(RolePermissionEntity);
        const entities = await repository.find({
            where: {
                role_id: id,
            },
            relations: {
                policy: {
                    children: true,
                },
                permission: true,
            },
            cache: {
                id: buildRedisKeyPath({
                    prefix: CachePrefix.ROLE_OWNED_PERMISSIONS,
                    key: id,
                }),
                milliseconds: 60_000,
            },
        });

        return entities.map((entity) => entity.permission);
    }
}
