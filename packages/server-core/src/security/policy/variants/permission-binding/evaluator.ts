/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from 'smob';
import type {
    CompositePolicy, PermissionBindingPolicy,
    PermissionItem,
    PolicyData, PolicyEvaluateContext, PolicyEvaluator, PolicyIdentity, PolicyWithType,
} from '@authup/kit';
import {
    BuiltInPolicyType,
    CompositePolicyEvaluator, PermissionBindingPolicyValidator, PolicyError, maybeInvertPolicyOutcome,
} from '@authup/kit';
import { useDataSource } from 'typeorm-extension';
import { RobotRepository, UserRepository } from '../../../../domains';

export class PermissionBindingPolicyEvaluator implements PolicyEvaluator<PermissionBindingPolicy> {
    protected validator : PermissionBindingPolicyValidator;

    constructor() {
        this.validator = new PermissionBindingPolicyValidator();
    }

    async can(
        ctx: PolicyEvaluateContext<PolicyWithType>,
    ) : Promise<boolean> {
        return ctx.spec.type === BuiltInPolicyType.PERMISSION_BINDING;
    }

    async validateSpecification(ctx: PolicyEvaluateContext) : Promise<PermissionBindingPolicy> {
        return this.validator.run(ctx.spec);
    }

    async validateData(ctx: PolicyEvaluateContext) : Promise<PolicyData> {
        if (!isObject(ctx.data.identity) && !isObject(ctx.data.permission)) {
            throw PolicyError.evaluatorContextInvalid();
        }

        return ctx.data;
    }

    async evaluate(ctx: PolicyEvaluateContext<
    PermissionBindingPolicy,
    PolicyData
    >): Promise<boolean> {
        const permissionsAll = await this.getIdentityPermissions(ctx.data.identity);

        const permissions = permissionsAll.filter((item) => {
            if (item.name !== ctx.data.permission.name) {
                return false;
            }

            if (
                typeof item.realm_id === 'string' ||
                typeof ctx.data.permission.realm_id === 'string'
            ) {
                return item.realm_id === ctx.data.permission.realm_id;
            }

            return !!item.realm_id === !!ctx.data.permission.realm_id;
        });

        if (permissions.length === 0) {
            return maybeInvertPolicyOutcome(false, ctx.spec.invert);
        }

        const policies = permissions
            .filter((permission) => !!permission.policy)
            .map((permission) => permission.policy);

        if (policies.length === 0) {
            return maybeInvertPolicyOutcome(true, ctx.spec.invert);
        }

        if (!ctx.evaluators) {
            return maybeInvertPolicyOutcome(false, ctx.spec.invert);
        }

        const compositePolicy : CompositePolicy = {
            children: policies,
        };

        const compositePolicyEvaluator = new CompositePolicyEvaluator();

        return compositePolicyEvaluator.evaluate({
            ...ctx,
            spec: compositePolicy,
        });
    }

    protected async getIdentityPermissions(identity: PolicyIdentity) : Promise<PermissionItem[]> {
        switch (identity.type) {
            case 'user': {
                return this.getUserPermissions(identity.id);
            }
            case 'robot': {
                return this.getRobotPermissions(identity.id);
            }
        }

        return [];
    }

    protected async getUserPermissions(id: string) : Promise<PermissionItem[]> {
        const dataSource = await useDataSource();
        const repository = new UserRepository(dataSource);

        return repository.getOwnedPermissions(id);
    }

    protected async getRobotPermissions(id: string) : Promise<PermissionItem[]> {
        const dataSource = await useDataSource();
        const repository = new RobotRepository(dataSource);

        return repository.getOwnedPermissions(id);
    }
}
