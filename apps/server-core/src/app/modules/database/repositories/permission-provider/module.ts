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
import { InternalError } from '@authup/errors';
import { buildCacheKey } from '@authup/server-kit';
import type {
    DataSource,
    EntityTarget,
    FindOptionsWhere,
    ObjectLiteral,
    Repository,
} from 'typeorm';
import { IsNull } from 'typeorm';
import type { IAuthorizationCatalogRepository, PermissionPolicies } from '../../../../../core/authorization/types.ts';
import {
    AUTHORIZATION_DEFINITIONS_CACHE_KEY,
    AUTHORIZATION_GRANT_POLICIES_CACHE_KEY,
    CachePrefix,
    ClientPermissionEntity,
    PermissionEntity,
    PermissionPolicyEntity,
    PolicyRepository,
    RolePermissionEntity,
    UserPermissionEntity,
} from '../../../../../adapters/database/domains/index.ts';
import { loadPolicyTrees } from '../bindings.ts';

export class PermissionDatabaseProvider implements IPermissionProvider, IAuthorizationCatalogRepository {
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

    async findDefinitions() : Promise<PermissionPolicies[]> {
        return this.withCache(AUTHORIZATION_DEFINITIONS_CACHE_KEY, () => this.readDefinitions());
    }

    async findGrantPolicies() : Promise<BasePolicy[]> {
        return this.withCache(AUTHORIZATION_GRANT_POLICIES_CACHE_KEY, () => this.readGrantPolicies());
    }

    /**
     * Invalidated by the subscriber of every table the value derives from
     * (AUTHORIZATION_CACHE_KEYS); the duration only bounds a key dropped
     * inside a transaction and repopulated before it commits (#3599).
     * Cloned on the way out, since the memory cache hands back the stored
     * reference and an evaluator may write to a policy it evaluates.
     */
    protected async withCache<T>(identifier: string, read: () => Promise<T>) : Promise<T> {
        const cache = this.dataSource.queryResultCache;
        if (!cache) {
            return read();
        }

        const saved = await cache.getFromCache({ identifier, duration: 60_000 });
        if (saved && !cache.isExpired(saved)) {
            return structuredClone(saved.result as T);
        }

        const result = await read();
        await cache.storeInCache({
            identifier,
            time: Date.now(),
            duration: 60_000,
            query: '',
            result,
        }, saved);

        return structuredClone(result);
    }

    protected async readDefinitions() : Promise<PermissionPolicies[]> {
        const entities = await this.repository.find();
        if (entities.length === 0) {
            return [];
        }

        const junctions = await this.permissionPolicyRepository.find();
        const trees = await loadPolicyTrees(
            this.dataSource.manager,
            [...new Set(junctions.map((junction) => junction.policyId))],
        );

        return entities.map((entity) => [
            {
                name: entity.name,
                realmId: entity.realmId ?? null,
                clientId: entity.clientId ?? null,
                decisionStrategy: entity.decisionStrategy ?? null,
            },
            junctions
                .filter((junction) => junction.permissionId === entity.id)
                .map((junction) => {
                    const tree = trees[junction.policyId];
                    if (!tree) {
                        // served without the tree, the definition evaluates as if that
                        // restriction did not exist (issue #3634)
                        throw new InternalError(
                            `The policy tree ${junction.policyId} of permission ${buildPermissionKey(entity)} could not be loaded.`,
                        );
                    }

                    return tree;
                }),
        ]);
    }

    protected async readGrantPolicies() : Promise<BasePolicy[]> {
        const ids = new Set<string>();
        for (const target of [RolePermissionEntity, UserPermissionEntity, ClientPermissionEntity]) {
            for (const id of await this.readGrantPolicyIds(target)) {
                ids.add(id);
            }
        }

        const trees = await loadPolicyTrees(this.dataSource.manager, [...ids]);

        return Object.values(trees);
    }

    protected async readGrantPolicyIds<E extends ObjectLiteral>(target: EntityTarget<E>) : Promise<string[]> {
        const rows : { policyId: string }[] = await this.dataSource.getRepository(target)
            .createQueryBuilder('junction')
            .select('junction.policyId', 'policyId')
            .distinct(true)
            .where('junction.policyId IS NOT NULL')
            .getRawMany();

        return rows.map((row) => row.policyId);
    }
}
