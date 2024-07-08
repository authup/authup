/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import type { AnyPolicy, CompositePolicy } from '@authup/permitus';
import {
    BuiltInPolicyType,
    PolicyDecisionStrategy,
} from '@authup/permitus';
import type { Policy } from '../policy';
import type { Permission, PermissionRelation } from './entity';

type PermissionRelationInput = Pick<PermissionRelation, 'permission'> & Partial<Omit<PermissionRelation, 'permission'>>;
export function transformPermissionRelationToPermission(entity: PermissionRelationInput): Permission {
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
        ...entity.permission,
        policy: policy as Policy,
    } satisfies Permission;
}
