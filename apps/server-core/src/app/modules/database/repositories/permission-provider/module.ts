/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    IPermissionProvider,
    PermissionBinding,
    PermissionGetOptions, PolicyWithType,
} from '@authup/access';
import { buildPermissionBindingKey } from '@authup/access';
import { buildCacheKey } from '@authup/server-kit';
import type { DataSource, FindOptionsWhere, Repository } from 'typeorm';
import { IsNull } from 'typeorm';
import {
    CachePrefix,
    PermissionEntity,
    PermissionPolicyEntity,
    PolicyRepository,
} from '../../../../../adapters/database/domains/index.ts';

export class PermissionDatabaseProvider implements IPermissionProvider {
    protected dataSource: DataSource;

    protected repository : Repository<PermissionEntity>;

    protected permissionPolicyRepository : Repository<PermissionPolicyEntity>;

    protected policyRepository: PolicyRepository;

    constructor(dataSource: DataSource) {
        this.dataSource = dataSource;
        this.repository = this.dataSource.getRepository(PermissionEntity);
        this.permissionPolicyRepository = this.dataSource.getRepository(PermissionPolicyEntity);
        this.policyRepository = new PolicyRepository(this.dataSource);
    }

    async findOne(options: PermissionGetOptions) : Promise<PermissionBinding | null> {
        const where : FindOptionsWhere<PermissionEntity> = {
            name: options.name,
        };

        if (typeof options.client_id !== 'undefined') {
            where.client_id = options.client_id === null ? IsNull() : options.client_id;
        }

        if (typeof options.realm_id !== 'undefined') {
            where.realm_id = options.realm_id === null ? IsNull() : options.realm_id;
        }

        const entity = await this.repository.findOne({
            where,
            cache: {
                id: buildCacheKey({
                    prefix: CachePrefix.PERMISSION,
                    key: buildPermissionBindingKey({
                        name: options.name,
                        client_id: options.client_id,
                        realm_id: options.realm_id,
                    }),
                }),
                milliseconds: 60_000,
            },
        });

        if (entity) {
            const junctions = await this.permissionPolicyRepository.find({
                where: { permission_id: entity.id },
                relations: ['policy'],
            });

            const policies : PolicyWithType[] = [];
            for (const junction of junctions) {
                if (junction.policy) {
                    const tree = await this.policyRepository.findDescendantsTree(junction.policy);
                    if (tree) {
                        policies.push(tree);
                    }
                }
            }

            return {
                permission: entity,
                policies: policies.length > 0 ? policies : undefined,
            };
        }

        return null;
    }
}
