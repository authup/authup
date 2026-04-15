/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    Robot,
    Role,
} from '@authup/core-kit';
import type { BasePolicy, PermissionPolicyBinding } from '@authup/access';
import { buildRedisKeyPath } from '@authup/server-kit';
import type { DataSource, EntityManager } from 'typeorm';
import { InstanceChecker, Repository } from 'typeorm';
import { CachePrefix } from '../constants.ts';
import { RobotEntity } from './entity.ts';
import { RobotRoleEntity } from '../robot-role/index.ts';
import { RobotPermissionEntity } from '../robot-permission/index.ts';
import { PolicyRepository } from '../policy/index.ts';

export class RobotRepository extends Repository<RobotEntity> {
    #manager: EntityManager;

    constructor(instance: DataSource | EntityManager) {
        super(RobotEntity, InstanceChecker.isDataSource(instance) ? instance.manager : instance);
        this.#manager = InstanceChecker.isDataSource(instance) ? instance.manager : instance;
    }

    async getBoundRoles(
        entity: string | Robot,
    ) : Promise<Role[]> {
        let id : string;
        if (typeof entity === 'string') {
            id = entity;
        } else {
            id = entity.id;
        }

        const entities = await this.manager
            .getRepository(RobotRoleEntity)
            .find({
                where: { robot_id: id },
                relations: { role: true },
                cache: {
                    id: buildRedisKeyPath({
                        prefix: CachePrefix.ROBOT_OWNED_ROLES,
                        key: id,
                    }),
                    milliseconds: 60_000,
                },
            });

        return entities
            .map((entity) => entity.role);
    }

    async getBoundPermissions(
        entity: string | Robot,
    ) : Promise<PermissionPolicyBinding[]> {
        let id : string;
        if (typeof entity === 'string') {
            id = entity;
        } else {
            id = entity.id;
        }

        const repository = this.manager.getRepository(RobotPermissionEntity);

        const entities = await repository.find({
            where: { robot_id: id },
            relations: { permission: true },
            cache: {
                id: buildRedisKeyPath({
                    prefix: CachePrefix.ROBOT_OWNED_PERMISSIONS,
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

        return entities
            .map((entry) => {
                const policies: BasePolicy[] = [];
                if (entry.policy_id && policyTrees[entry.policy_id]) {
                    policies.push(policyTrees[entry.policy_id]);
                }

                return {
                    permission:  entry.permission,
                    policies: policies.length > 0 ? policies : undefined,
                };
            });
    }

    private async loadPolicyTrees(policyIds: string[]): Promise<Record<string, BasePolicy>> {
        if (policyIds.length === 0) {
            return {};
        }

        const policyRepository = new PolicyRepository(this.#manager);
        const result: Record<string, BasePolicy> = {};

        for (const id of policyIds) {
            const tree = await policyRepository.findDescendantsTreeById(id);
            if (tree) {
                result[id] = tree;
            }
        }

        return result;
    }
}
