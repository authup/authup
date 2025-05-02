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
    PolicyEvaluateContext,
    PolicyEvaluator,
    PolicyInput,
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
        return ctx.config.type === BuiltInPolicyType.PERMISSION_BINDING;
    }

    async validateConfig(ctx: PolicyEvaluateContext) : Promise<PermissionBindingPolicy> {
        return this.validator.run(ctx.config);
    }

    async validateInput(ctx: PolicyEvaluateContext) : Promise<PolicyInput> {
        if (!isObject(ctx.input.identity) && !isObject(ctx.input.permission)) {
            throw PolicyError.evaluatorContextInvalid();
        }

        return ctx.input;
    }

    async evaluate(ctx: PolicyEvaluateContext<
    PermissionBindingPolicy,
    PolicyInput
    >): Promise<boolean> {
        const dataSource = await useDataSource();
        const identityPermissionService = new IdentityPermissionService(dataSource);

        // get all identity permissions with applicable client(_id) restriction
        const identityPermissions = await identityPermissionService.getFor(ctx.input.identity)
            .then((permissions) => permissions.filter((item) => {
                if (item.name !== ctx.input.permission.name) {
                    return false;
                }

                let realmId : string | null;
                if (typeof ctx.input.permission.realmId === 'undefined') {
                    realmId = null;
                } else {
                    realmId = ctx.input.permission.realmId;
                }

                let clientId : string | null;
                if (typeof ctx.input.permission.clientId === 'undefined') {
                    clientId = null;
                } else {
                    clientId = ctx.input.permission.clientId;
                }

                // we are comparing only string with null (db resources always null or string)
                return realmId === item.realm_id && clientId === item.client_id;
            }));

        if (identityPermissions.length === 0) {
            return maybeInvertPolicyOutcome(false, ctx.config.invert);
        }

        const permissionsMerged = mergePermissionItems(identityPermissions);
        if (permissionsMerged.length === 0) {
            return maybeInvertPolicyOutcome(false, ctx.config.invert);
        }

        const policies = permissionsMerged
            .filter((permission) => !!permission.policy)
            .map((permission) => permission.policy);

        if (policies.length === 0) {
            return maybeInvertPolicyOutcome(true, ctx.config.invert);
        }

        if (!ctx.evaluators) {
            return maybeInvertPolicyOutcome(false, ctx.config.invert);
        }

        const compositePolicy : CompositePolicy = {
            children: policies,
        };

        const compositePolicyEvaluator = new CompositePolicyEvaluator();

        return compositePolicyEvaluator.evaluate({
            ...ctx,
            config: compositePolicy,
        });
    }
}
