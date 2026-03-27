/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client, PermissionBinding, Role } from '@authup/core-kit';
import type { PolicyWithType } from '@authup/access';
import { buildRedisKeyPath } from '@authup/server-kit';
import type { DataSource, EntityManager } from 'typeorm';
import { InstanceChecker, Repository } from 'typeorm';
import { CachePrefix } from '../constants.ts';
import { ClientPermissionEntity } from '../client-permission/index.ts';
import { ClientRoleEntity } from '../client-role/index.ts';
import { PolicyRepository } from '../policy/index.ts';
import { ClientEntity } from './entity.ts';

export class ClientRepository extends Repository<ClientEntity> {
    #manager: EntityManager;

    constructor(instance: DataSource | EntityManager) {
        super(ClientEntity, InstanceChecker.isDataSource(instance) ? instance.manager : instance);
        this.#manager = InstanceChecker.isDataSource(instance) ? instance.manager : instance;
    }

    async getBoundRoles(
        entity: string | Client,
    ) : Promise<Role[]> {
        let id : string;
        if (typeof entity === 'string') {
            id = entity;
        } else {
            id = entity.id;
        }

        const entities = await this.manager
            .getRepository(ClientRoleEntity)
            .find({
                where: {
                    client_id: id,
                },
                relations: {
                    role: true,
                },
                cache: {
                    id: buildRedisKeyPath({
                        prefix: CachePrefix.CLIENT_OWNED_ROLES,
                        key: id,
                    }),
                    milliseconds: 60_000,
                },
            });

        return entities.map((entity) => entity.role);
    }

    async getBoundPermissions(
        entity: string | Client,
    ) : Promise<PermissionBinding[]> {
        let id : string;
        if (typeof entity === 'string') {
            id = entity;
        } else {
            id = entity.id;
        }

        const repository = this.manager.getRepository(ClientPermissionEntity);

        const entities = await repository.find({
            where: {
                client_id: id,
            },
            relations: {
                permission: true,
            },
            cache: {
                id: buildRedisKeyPath({
                    prefix: CachePrefix.CLIENT_OWNED_PERMISSIONS,
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
                permission: {
                    name: entry.permission.name,
                    realm_id: entry.permission.realm_id,
                    client_id: entry.permission.client_id,
                    decision_strategy: entry.permission.decision_strategy,
                },
                policies: policies.length > 0 ? policies : undefined,
            };
        });
    }

    private async loadPolicyTrees(policyIds: string[]): Promise<Record<string, PolicyWithType>> {
        if (policyIds.length === 0) {
            return {};
        }

        const policyRepository = new PolicyRepository(this.#manager);
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
