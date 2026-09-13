/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { z } from 'zod';
import type { BasePolicy } from '../../policy';
import {
    BuiltInPolicyType,
    IdentityPermissionBindingPolicyEvaluator,
    PolicyData,
    PolicyDefaultEvaluators,
    PolicyEngine,
} from '../../policy';
import type {
    IPermissionEvaluator,
    PermissionCompileContext,
    PermissionCompileResult,
    PermissionEvaluationContext,
} from '../evaluator';
import { PermissionEvaluator } from '../evaluator';
import { buildPermissionKey } from '../helpers';
import { PermissionMemoryProvider } from '../provider';
import type { PermissionPolicyBinding } from '../types';
import { containsBindingCheck, projectAuthorizationPolicy } from './policy';
import { authorizationDocumentSchema } from './schema';
import type { AuthorizationPolicy } from './types';

const realmMatchSchema = z.union([z.string().min(1), z.array(z.string().min(1)).min(1), z.null()]);

function toPolicy(tree: AuthorizationPolicy) : BasePolicy {
    const {
        invert,
        children,
        ...policy
    } = tree;

    return {
        ...policy,
        ...(typeof invert === 'boolean' ? { invert } : {}),
        ...(children ? { children: children.map((child) => toPolicy(child)) } : {}),
    };
}

/**
 * Build a resource-server (or console) evaluator from an `AuthorizationDocument`
 * (`GET /authorization`). Rejects legacy, incomplete and unsupported input.
 *
 * `evaluate` / `evaluateOneOf` require an explicit REALM_MATCH data key (null
 * for a global row); `preEvaluate` / `preEvaluateOneOf` are the pre-gate and
 * enforce reach only when that key is present. `compile` returns the
 * allow/deny/conditional/post contract; a `post` collection query must be
 * rejected or evaluated over every candidate before paging. The document's
 * identity is authoritative; `options.decisionStrategy` is forwarded and the
 * policy include, exclude and pending options are refused.
 */
export async function createAuthorizationEvaluator(input: unknown) : Promise<IPermissionEvaluator> {
    // Detach: a later mutation of a cached HTTP response cannot widen grants
    // after validation (attribute queries carry arbitrary nested data).
    const document = authorizationDocumentSchema.parse(structuredClone(input));

    const trees = new Map<string, AuthorizationPolicy>();
    for (const [id, raw] of Object.entries(document.policies)) {
        trees.set(id, await projectAuthorizationPolicy(raw));
    }

    const resolve = (ids: string[], withinGrant: boolean) : BasePolicy[] | undefined => {
        const policies : BasePolicy[] = [];
        for (const id of ids) {
            const tree = trees.get(id);
            if (!tree) {
                throw new Error(`Unknown authorization policy: ${id}`);
            }
            if (withinGrant && containsBindingCheck(tree)) {
                throw new Error('A grant policy cannot recursively evaluate its own permission binding.');
            }
            policies.push(toPolicy(tree));
        }

        return policies.length > 0 ? policies : undefined;
    };

    const definitions : PermissionPolicyBinding[] = [];
    const grants : PermissionPolicyBinding[] = [];
    const keys = new Set<string>();
    for (const entry of document.permissions) {
        const permission = {
            name: entry.name,
            realmId: entry.realm_id,
            clientId: entry.client_id,
            decisionStrategy: entry.decision_strategy ?? undefined,
        };
        const key = buildPermissionKey(permission);
        if (keys.has(key)) {
            throw new Error(`Duplicate authorization permission: ${key}`);
        }
        keys.add(key);

        definitions.push({ permission, policies: resolve(entry.policies, false) });
        for (const grant of entry.grants) {
            grants.push({
                permission,
                realmScope: grant.realm_scope,
                policies: resolve(grant.policies, true),
            });
        }
    }

    const engine = new PolicyEngine(PolicyDefaultEvaluators);
    engine.registerEvaluator(
        BuiltInPolicyType.PERMISSION_BINDING,
        new IdentityPermissionBindingPolicyEvaluator({ getFor: async () => grants }),
    );
    const evaluator = new PermissionEvaluator({
        provider: new PermissionMemoryProvider(definitions),
        policyEngine: engine,
    });

    const withIdentity = (input?: PolicyData) : PolicyData => {
        const data = input?.clone() ?? new PolicyData();
        data.set(BuiltInPolicyType.IDENTITY, {
            id: document.identity.id,
            type: document.identity.type,
            realmId: document.identity.realm_id ?? undefined,
            realmName: document.identity.realm_name ?? undefined,
            clientId: document.identity.client_id,
        });

        return data;
    };

    const forGate = (ctx: PermissionEvaluationContext) : PermissionEvaluationContext => {
        if (
            ctx.options?.policiesIncluded ||
            ctx.options?.policiesExcluded ||
            ctx.options?.pendingPolicies
        ) {
            throw new Error('The authorization evaluator does not accept policy bypass options.');
        }

        return {
            name: ctx.name,
            realmId: ctx.realmId,
            clientId: ctx.clientId,
            data: withIdentity(ctx.data),
            ...(ctx.options?.decisionStrategy ?
                { options: { decisionStrategy: ctx.options.decisionStrategy } } :
                {}),
        };
    };

    const forResource = (ctx: PermissionEvaluationContext) : PermissionEvaluationContext => {
        const next = forGate(ctx);
        if (!next.data!.has(BuiltInPolicyType.REALM_MATCH)) {
            throw new Error('Resource authorization requires realmMatch data (null for a global resource).');
        }
        realmMatchSchema.parse(next.data!.get(BuiltInPolicyType.REALM_MATCH));

        return next;
    };

    return {
        async evaluate(ctx: PermissionEvaluationContext) : Promise<void> {
            return evaluator.evaluate(forResource(ctx));
        },
        async evaluateOneOf(ctx: PermissionEvaluationContext) : Promise<void> {
            return evaluator.evaluateOneOf(forResource(ctx));
        },
        async preEvaluate(ctx: PermissionEvaluationContext) : Promise<void> {
            return evaluator.preEvaluate(forGate(ctx));
        },
        async preEvaluateOneOf(ctx: PermissionEvaluationContext) : Promise<void> {
            return evaluator.preEvaluateOneOf(forGate(ctx));
        },
        async compile(ctx: PermissionCompileContext) : Promise<PermissionCompileResult> {
            if (ctx.data?.has(BuiltInPolicyType.REALM_MATCH) || ctx.data?.has(BuiltInPolicyType.ATTRIBUTES)) {
                throw new Error('Compile authorization without resource realm or row attributes.');
            }

            return evaluator.compile({
                name: ctx.name,
                realmId: ctx.realmId,
                clientId: ctx.clientId,
                data: withIdentity(ctx.data),
            });
        },
    };
}
