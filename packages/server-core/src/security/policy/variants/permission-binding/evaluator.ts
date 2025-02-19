/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from 'smob';
import type {
    CompositePolicy,
    PermissionBindingPolicy,
    PolicyData,
    PolicyEvaluateContext,
    PolicyEvaluator,
    PolicyWithType,
} from '@authup/access';
import {
    BuiltInPolicyType,
    CompositePolicyEvaluator,
    PermissionBindingPolicyValidator,
    PolicyError,
    maybeInvertPolicyOutcome,
    mergePermissionItems,
} from '@authup/access';
import { useDataSource } from 'typeorm-extension';
import { IdentityPermissionService } from '../../../../services';

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
        const dataSource = await useDataSource();
        const identityPermissionService = new IdentityPermissionService(dataSource);
        const permissionsAll = await identityPermissionService.getFor(ctx.data.identity)
            .then((permissions) => permissions.filter((item) => {
                if (item.name !== ctx.data.permission.name) {
                    return false;
                }

                if (
                    typeof item.realm_id === 'string' ||
                    typeof ctx.data.permission.realmId === 'string'
                ) {
                    return item.realm_id === ctx.data.permission.realmId;
                }

                if (
                    typeof item.client_id === 'string' ||
                    typeof ctx.data.permission.clientId === 'string'
                ) {
                    return item.client_id === ctx.data.permission.clientId;
                }

                return true;
            }));

        if (permissionsAll.length === 0) {
            return maybeInvertPolicyOutcome(false, ctx.spec.invert);
        }

        const permissions = mergePermissionItems(permissionsAll);

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
}
