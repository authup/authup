/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    CompositePolicy, IPolicyEvaluator, PermissionItem, PolicyEvaluationContext, PolicyEvaluationResult,
    PolicyWithType,
} from '@authup/access';
import {
    AttributesPolicyEvaluator,
    BuiltInPolicyType,
    IdentityPolicyEvaluator,
    PermissionBindingPolicyValidator,
    PolicyEngine,
    PolicyIssueCode,
    definePolicyIssueItem,
    maybeInvertPolicyOutcome,
    mergePermissionItems,
} from '@authup/access';
import { useDataSource } from 'typeorm-extension';
import { IdentityPermissionService } from '../../../../services/index.ts';

export class PermissionBindingPolicyEvaluator implements IPolicyEvaluator {
    protected validator : PermissionBindingPolicyValidator;

    protected identityEvaluator: IdentityPolicyEvaluator;

    protected attributesEvaluator : AttributesPolicyEvaluator;

    constructor() {
        this.validator = new PermissionBindingPolicyValidator();
        this.identityEvaluator = new IdentityPolicyEvaluator();
        this.attributesEvaluator = new AttributesPolicyEvaluator();
    }

    async accessData(ctx: PolicyEvaluationContext) : Promise<PermissionItem | null> {
        if (!ctx.data.has(BuiltInPolicyType.PERMISSION_BINDING)) {
            return null;
        }

        if (ctx.data.isValidated(BuiltInPolicyType.PERMISSION_BINDING)) {
            return ctx.data.get(BuiltInPolicyType.PERMISSION_BINDING);
        }

        // todo: run validator on attributes (isObject ...)
        const data = ctx.data.get<PermissionItem>(BuiltInPolicyType.PERMISSION_BINDING);

        ctx.data.set(BuiltInPolicyType.PERMISSION_BINDING, data);
        ctx.data.setValidated(BuiltInPolicyType.PERMISSION_BINDING);

        return data;
    }

    async evaluate(value: Record<string, any>, ctx: PolicyEvaluationContext): Promise<PolicyEvaluationResult> {
        // todo: catch errors + transform to issue(s)
        const policy = await this.validator.run(value);

        const identity = await this.identityEvaluator.accessData(ctx);
        if (!identity) {
            return {
                success: false,
                issues: [
                    definePolicyIssueItem({
                        code: PolicyIssueCode.DATA_MISSING,
                        message: 'The data property identity is missing',
                        path: ctx.path,
                    }),
                ],
            };
        }
        const permission = await this.accessData(ctx);
        if (!permission) {
            return {
                success: false,
                issues: [
                    definePolicyIssueItem({
                        code: PolicyIssueCode.DATA_MISSING,
                        message: 'The data property permission is missing',
                        path: ctx.path,
                    }),
                ],
            };
        }

        const dataSource = await useDataSource();
        const identityPermissionService = new IdentityPermissionService(dataSource);

        // get all identity permissions with applicable client(_id) restriction
        const identityPermissions = await identityPermissionService.getFor(identity)
            .then((permissions) => permissions.filter((item) => {
                if (item.name !== permission?.name) {
                    return false;
                }

                // we are comparing only string with null (db resources always null or string)
                return (permission?.realmId ?? null) === item.realm_id &&
                    (permission?.clientId ?? null) === item.client_id;
            }));

        if (identityPermissions.length === 0) {
            return {
                success: maybeInvertPolicyOutcome(false, policy.invert),
            };
        }

        const permissionsMerged = mergePermissionItems(
            identityPermissions.map((raw) => ({
                name: raw.name,
                realmId: raw.realm_id,
                clientId: raw.client_id,
                policyId: raw.policy,
            })),
        );
        if (permissionsMerged.length === 0) {
            return {
                success: maybeInvertPolicyOutcome(false, policy.invert),
            };
        }

        const policies : PolicyWithType[] = permissionsMerged
            .map((permission) => permission.policy)
            .filter((policy) => !!policy);

        if (policies.length === 0) {
            return {
                success: maybeInvertPolicyOutcome(true, policy.invert),
            };
        }

        if (!ctx.evaluators) {
            return {
                success: maybeInvertPolicyOutcome(false, policy.invert),
            };
        }

        const compositePolicy : PolicyWithType<CompositePolicy> = {
            children: policies,
            type: BuiltInPolicyType.COMPOSITE,
        };

        const engine = new PolicyEngine(ctx.evaluators);
        const outcome = await engine.evaluate(compositePolicy, {
            ...ctx,
            path: [...(ctx.path || []), compositePolicy.type],
        });

        return {
            ...outcome,
            success: maybeInvertPolicyOutcome(outcome.success, policy.invert),
        };
    }
}
