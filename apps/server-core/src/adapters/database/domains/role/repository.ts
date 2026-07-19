/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DataSource, EntityManager } from 'typeorm';
import { CachePrefix } from '../constants.ts';
import { EARepository } from '../../extra-attribute-repository/index.ts';
import { RoleAttributeEntity } from '../role-attribute/entity.ts';
import { RoleEntity } from './entity.ts';

export class RoleRepository extends EARepository<RoleEntity, RoleAttributeEntity> {
    constructor(instance: DataSource | EntityManager) {
        super(instance, {
            attributeProperties: (input, parent) => {
                input.roleId = parent.id;
                input.realmId = parent.realmId;

                return input;
            },
            entity: RoleEntity,
            entityPrimaryColumn: 'id',
            attributeEntity: RoleAttributeEntity,
            attributeForeignColumn: 'roleId',
            cachePrefix: CachePrefix.ROLE_OWNED_PERMISSIONS,
        });
    }
}
