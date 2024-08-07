/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import type { AnyPolicy, CompositePolicy, PermissionItem } from '@authup/permitus';
import {
    BuiltInPolicyType,
    PolicyDecisionStrategy,
} from '@authup/permitus';
import type { Policy } from '../policy';
import type { PermissionRelation } from './entity';

type PermissionRelationInput = Pick<PermissionRelation, 'permission'> & Partial<Omit<PermissionRelation, 'permission'>>;
export function transformPermissionRelationToPermissionItem(entity: PermissionRelationInput): PermissionItem {
    if (typeof entity.permission === 'undefined') {
        throw new SyntaxError('The permission relation attribute is required.');
    }

    let policy : AnyPolicy | undefined;

    if (
        entity.permission.policy &&
        entity.policy
    ) {
        policy = {
            type: BuiltInPolicyType.COMPOSITE,
            decisionStrategy: PolicyDecisionStrategy.UNANIMOUS,
            children: [
                entity.permission.policy,
                entity.policy,
            ],
        } satisfies CompositePolicy;
    } else if (entity.policy) {
        policy = entity.policy;
    } else if (entity.permission.policy) {
        policy = entity.policy;
    }

    return {
        name: entity.permission.name,
        realm_id: entity.permission.realm_id,
        policy: policy as Policy,
    };
}

export function mergePermissionItems(input: PermissionItem[]) : PermissionItem[] {
    const grouped : Record<string, PermissionItem[]> = {};
    for (let i = 0; i < input.length; i++) {
        const entity = input[i];
        const key = `${entity.realm_id || '/'}:${entity.name}`;

        if (typeof grouped[key] === 'undefined') {
            grouped[key] = [];
        }

        grouped[key].push(entity);
    }

    const output : PermissionItem[] = [];
    const keys = Object.keys(grouped);
    for (let i = 0; i < keys.length; i++) {
        const [permission, ...permissions] = grouped[keys[i]];

        const policy : CompositePolicy = {
            type: BuiltInPolicyType.COMPOSITE,
            decisionStrategy: PolicyDecisionStrategy.AFFIRMATIVE,
            children: [],
        };

        for (let j = 0; j < permissions.length; j++) {
            if (permissions[j].policy) {
                policy.children.push(permissions[j].policy);
            }
        }

        if (policy.children.length > 0) {
            permission.policy = policy;
        }

        output.push(permission);
    }

    return output;
}
