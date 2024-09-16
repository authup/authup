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
} from '@authup/kit';
import { BuiltInPolicyType } from '@authup/kit';
import type { DataSource, Repository } from 'typeorm';
import { PermissionEntity } from '../../../domains';

export class PermissionDBProvider implements PermissionProvider {
    protected dataSource: DataSource;

    protected repository : Repository<PermissionEntity>;

    constructor(dataSource: DataSource) {
        this.dataSource = dataSource;
        this.repository = this.dataSource.getRepository(PermissionEntity);
    }

    async get(options: PermissionGetOptions) : Promise<PermissionItem | undefined> {
        const entity = await this.repository.findOne({
            where: {
                name: options.name,
                ...(options.realmId ? { realm_id: options.realmId } : {}),
            },
            relations: [
                'policy',
                'policy.children',
            ],
        });

        if (entity) {
            return {
                name: entity.name,
                ...(entity.realm_id ? { realm_id: entity.realm_id } : {}),
                // todo: fake policy should only be enabled for built_in
                policy: entity.policy || this.getFakePolicy(),
            };
        }

        return undefined;
    }

    getFakePolicy() {
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
        };

        return composite;
    }
}
