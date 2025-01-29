/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    CompositePolicy,
    IdentityPolicy,
    PermissionBindingPolicy,
    PermissionGetOptions,
    PermissionItem,
    PermissionProvider,
    PolicyWithType,
    RealmMatchPolicy,
} from '@authup/access';
import { BuiltInPolicyType, DecisionStrategy } from '@authup/access';
import { buildCacheKey } from '@authup/server-kit';
import type { DataSource, Repository } from 'typeorm';
import { CachePrefix, PermissionEntity, PolicyRepository } from '../../../database/domains';

export class PermissionDBProvider implements PermissionProvider {
    protected dataSource: DataSource;

    protected repository : Repository<PermissionEntity>;

    protected policyRepository: PolicyRepository;

    constructor(dataSource: DataSource) {
        this.dataSource = dataSource;
        this.repository = this.dataSource.getRepository(PermissionEntity);
        this.policyRepository = new PolicyRepository(this.dataSource);
    }

    async get(options: PermissionGetOptions) : Promise<PermissionItem | undefined> {
        const entity = await this.repository.findOne({
            where: {
                name: options.name,
                ...(options.realmId ? { realm_id: options.realmId } : {}),
            },
            relations: [
                'policy',
            ],
            cache: {
                id: buildCacheKey({
                    prefix: CachePrefix.PERMISSION,
                    key: options.name,
                }),
                milliseconds: 60_000,
            },
        });

        if (entity) {
            let policy : PolicyWithType | undefined;
            if (entity.policy) {
                // todo: entity.policy and children need to be transformed
                policy = await this.policyRepository.findDescendantsTree(entity.policy);
            } else {
                policy = this.getDefaultPolicy();
            }

            return {
                name: entity.name,
                ...(entity.realm_id ? { realm_id: entity.realm_id } : {}),
                policy,
            };
        }

        return undefined;
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
