/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
 
    PermissionBinding, 
    Role, 
    User, 
    UserAttribute, 
} from '@authup/core-kit';
import type { PolicyWithType } from '@authup/access';
import { buildRedisKeyPath } from '@authup/server-kit';
import type { DataSource, EntityManager } from 'typeorm';
import { CachePrefix } from '../constants.ts';
import { EARepository } from '../../extra-attribute-repository/index.ts';
import { UserAttributeEntity } from '../user-attribute/index.ts';
import { UserPermissionEntity } from '../user-permission/index.ts';
import { UserRoleEntity } from '../user-role/index.ts';
import { PolicyRepository } from '../policy/index.ts';
import { UserEntity } from './entity.ts';

export class UserRepository extends EARepository<User, UserAttribute> {
    constructor(instance: DataSource | EntityManager) {
        super(instance, {
            attributeProperties: (input, parent) => {
                input.user_id = parent.id;
                input.realm_id = parent.realm_id;

                return input;
            },
            entity: UserEntity,
            entityPrimaryColumn: 'id',
            attributeEntity: UserAttributeEntity,
            attributeForeignColumn: 'user_id',
            cachePrefix: CachePrefix.USER_OWNED_ATTRIBUTES,
        });
    }

    // ------------------------------------------------------------------

    async getBoundRoles(
        entity: string | User,
    ) : Promise<Role[]> {
        let id : string;
        if (typeof entity === 'string') {
            id = entity;
        } else {
            id = entity.id;
        }

        const items = await this.manager
            .getRepository(UserRoleEntity)
            .find({
                where: { user_id: id },
                relations: { role: true },
                cache: {
                    id: buildRedisKeyPath({
                        prefix: CachePrefix.USER_OWNED_ROLES,
                        key: id,
                    }),
                    milliseconds: 60_000,
                },
            });

        return items.map((relation) => relation.role);
    }

    async getBoundPermissions(
        entity: string | User,
    ) : Promise<PermissionBinding[]> {
        let id : string;
        if (typeof entity === 'string') {
            id = entity;
        } else {
            id = entity.id;
        }

        const repository = this.manager.getRepository(UserPermissionEntity);

        const entities = await repository.find({
            where: { user_id: id },
            relations: { permission: true },
            cache: {
                id: buildRedisKeyPath({
                    prefix: CachePrefix.USER_OWNED_PERMISSIONS,
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
