/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import type { Ability, AnyPolicy, CompositePolicy } from '@authup/kit';
import {
    BuiltInPolicyType,
    PolicyDecisionStrategy,
} from '@authup/kit';
import type { Permission, PermissionRelation } from './entity';

type PermissionMinimal = Pick<Permission, 'name'> & Partial<Omit<Permission, 'name'>>;

export function buildAbilityFromPermission(entity: PermissionMinimal) : Ability {
    return {
        name: entity.name,
        realmId: entity.realm_id,
        policy: entity.policy,
    } satisfies Ability;
}

type PermissionRelationMinimal = Pick<PermissionRelation, 'permission'> & Partial<Omit<PermissionRelation, 'permission'>>;

export function buildAbilityFromPermissionRelation(entity: PermissionRelationMinimal): Ability {
    if (typeof entity.permission === 'undefined') {
        throw new SyntaxError('The permission relation attribute is mandatory.');
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
        realmId: entity.permission.realm_id,
        policy,
    } satisfies Ability;
}
