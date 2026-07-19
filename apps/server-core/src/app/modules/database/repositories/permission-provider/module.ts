/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    BasePolicy,
    IPermissionProvider,
    PermissionGetOptions,
    PermissionPolicyBindingAggregated,
} from '@authup/access';
import {
    aggregatePermissionPolicyBindings,
    buildPermissionKey,
} from '@authup/access';
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

    async findOne(options: PermissionGetOptions) : Promise<PermissionPolicyBindingAggregated | null> {
        const where : FindOptionsWhere<PermissionEntity> = { name: options.name };

        if (typeof options.clientId !== 'undefined') {
            where.clientId = options.clientId === null ? IsNull() : options.clientId;
        }

        if (typeof options.realmId !== 'undefined') {
            where.realmId = options.realmId === null ? IsNull() : options.realmId;
        }

        const entity = await this.repository.findOne({
            where,
            cache: {
                id: buildCacheKey({
                    prefix: CachePrefix.PERMISSION,
                    key: buildPermissionKey({
                        name: options.name,
                        clientId: options.clientId,
                        realmId: options.realmId,
                    }),
                }),
                milliseconds: 60_000,
            },
        });

        if (entity) {
            const junctions = await this.permissionPolicyRepository.find({
                where: { permissionId: entity.id },
                relations: { policy: true },
            });

            const policies : BasePolicy[] = [];
            for (const junction of junctions) {
                if (junction.policy) {
                    const tree = await this.policyRepository.findDescendantsTree(junction.policy);
                    if (tree) {
                        policies.push(tree);
                    }
                }
            }

            const [aggregated] = aggregatePermissionPolicyBindings([
                {
                    permission: entity,
                    policies: policies.length > 0 ? policies : undefined,
                },
            ]);

            return aggregated ?? null;
        }

        return null;
    }
}
