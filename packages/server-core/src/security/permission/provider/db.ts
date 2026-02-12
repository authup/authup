/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    CompositePolicy,
    IPermissionRepository,
    IdentityPolicy,
    PermissionBindingPolicy,
    PermissionGetOptions,
    PermissionItem,
    PolicyWithType,
    RealmMatchPolicy,
} from '@authup/access';
import { BuiltInPolicyType, DecisionStrategy, buildPermissionItemKey } from '@authup/access';
import type { Permission } from '@authup/core-kit';
import { buildCacheKey } from '@authup/server-kit';
import type { DataSource, FindOptionsWhere, Repository } from 'typeorm';
import { CachePrefix, PermissionEntity, PolicyRepository } from '../../../adapters/database/domains/index.ts';

export class PermissionDatabaseRepository implements IPermissionRepository {
    protected dataSource: DataSource;

    protected repository : Repository<PermissionEntity>;

    protected policyRepository: PolicyRepository;

    constructor(dataSource: DataSource) {
        this.dataSource = dataSource;
        this.repository = this.dataSource.getRepository(PermissionEntity);
        this.policyRepository = new PolicyRepository(this.dataSource);
    }

    async findOne(options: PermissionGetOptions) : Promise<PermissionItem | null> {
        const where : FindOptionsWhere<Permission> = {
            name: options.name,
        };

        if (options.clientId) {
            where.client_id = options.clientId;
        }

        if (options.realmId) {
            where.realm_id = options.realmId;
        }

        const entity = await this.repository.findOne({
            where,
            relations: [
                'policy',
            ],
            cache: {
                id: buildCacheKey({
                    prefix: CachePrefix.PERMISSION,
                    key: buildPermissionItemKey({
                        name: options.name,
                        clientId: options.clientId,
                        realmId: options.realmId,
                    }),
                }),
                milliseconds: 60_000,
            },
        });

        if (entity) {
            let policy : PolicyWithType | undefined;
            if (entity.policy) {
                policy = await this.policyRepository.findDescendantsTree(entity.policy);
            } else {
                policy = this.getDefaultPolicy();
            }

            return {
                name: entity.name,
                realmId: entity.realm_id,
                clientId: entity.client_id,
                policy,
            };
        }

        return null;
    }

    getDefaultPolicy() {
        const children : PolicyWithType[] = [];
        const identity : PolicyWithType<IdentityPolicy> = {
            type: BuiltInPolicyType.IDENTITY,
        };
        children.push(identity);

        const realmMatch : PolicyWithType<RealmMatchPolicy> = {
            type: BuiltInPolicyType.REALM_MATCH,
            attributeName: ['realm_id'],
            attributeNameStrict: false,
            identityMasterMatchAll: true,
        };
        children.push(realmMatch);

        const permissionBinding : PolicyWithType<PermissionBindingPolicy> = {
            type: BuiltInPolicyType.PERMISSION_BINDING,
        };
        children.push(permissionBinding);

        const composite : PolicyWithType<CompositePolicy> = {
            type: BuiltInPolicyType.COMPOSITE,
            children,
            decisionStrategy: DecisionStrategy.UNANIMOUS,
        };

        return composite;
    }
}
