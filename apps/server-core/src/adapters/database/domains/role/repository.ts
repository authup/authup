/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { buildRedisKeyPath } from '@authup/server-kit';
import type { DataSource, EntityManager } from 'typeorm';
import type {
    PermissionBinding, Role
} from '@authup/core-kit';
import type { PolicyWithType } from '@authup/access';
import { CachePrefix } from '../constants.ts';
import { EARepository } from '../../extra-attribute-repository/index.ts';
import { RoleAttributeEntity } from '../role-attribute/entity.ts';
import { RoleEntity } from './entity.ts';
import { RolePermissionEntity } from '../role-permission/index.ts';
import { PolicyRepository } from '../policy/index.ts';

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
    ) : Promise<PermissionBinding[]> {
        const promises : Promise<PermissionBinding[]>[] = [];

        for (const id of ids) {
            promises.push(this.getBoundPermissions(id));
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
    ) : Promise<PermissionBinding[]> {
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

        const policyIds = new Set<string>();
        for (const entry of entities) {
            if (entry.policy_id) {
                policyIds.add(entry.policy_id);
            }
        }

        const policyTrees = await this.loadPolicyTrees([...policyIds]);

        return entities.map((entry) => {
            const policies: PolicyWithType[] = [];
            if (entry.policy_id && policyTrees[entry.policy_id]) {
                policies.push(policyTrees[entry.policy_id]);
            }

            return {
                permission:  entry.permission,
                policies: policies.length > 0 ? policies : undefined,
            };
        });
    }

    private async loadPolicyTrees(policyIds: string[]): Promise<Record<string, PolicyWithType>> {
        if (policyIds.length === 0) {
            return {};
        }

        const policyRepository = new PolicyRepository(this.manager);
        const result: Record<string, PolicyWithType> = {};

        for (const id of policyIds) {
            const tree = await policyRepository.findDescendantsTreeById(id);
            if (tree) {
                result[id] = tree;
            }
        }

        return result;
    }
}
