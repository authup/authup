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
import { In, IsNull } from 'typeorm';
import type { IPermissionDefinitionProvider, PermissionDefinition } from '../../../../../core/authorization/types.ts';
import {
    CachePrefix,
    PermissionEntity,
    PermissionPolicyEntity,
    PolicyRepository,
} from '../../../../../adapters/database/domains/index.ts';
import { loadPolicyTrees } from '../bindings.ts';

export class PermissionDatabaseProvider implements IPermissionProvider, IPermissionDefinitionProvider {
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

    async findDefinitions(keys: PermissionGetOptions[]) : Promise<PermissionDefinition[]> {
        if (keys.length === 0) {
            return [];
        }

        const wanted = new Set(keys.map((key) => buildPermissionKey({
            name: key.name,
            realmId: key.realmId ?? null,
            clientId: key.clientId ?? null,
        })));

        const entities = await this.repository.find({ where: { name: In([...new Set(keys.map((key) => key.name))]) } });
        const matched = entities.filter((entity) => wanted.has(buildPermissionKey({
            name: entity.name,
            realmId: entity.realmId ?? null,
            clientId: entity.clientId ?? null,
        })));
        if (matched.length === 0) {
            return [];
        }

        const junctions = await this.permissionPolicyRepository.find({ where: { permissionId: In(matched.map((entity) => entity.id)) } });
        const trees = await loadPolicyTrees(
            this.dataSource.manager,
            [...new Set(junctions.map((junction) => junction.policyId))],
        );

        return matched.map((entity) => ({
            permission: {
                name: entity.name,
                realmId: entity.realmId ?? null,
                clientId: entity.clientId ?? null,
                decisionStrategy: entity.decisionStrategy ?? null,
            },
            policies: junctions
                .filter((junction) => junction.permissionId === entity.id)
                .map((junction) => trees[junction.policyId])
                .filter((tree) : tree is BasePolicy => !!tree),
        }));
    }
}
