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
import { normalizeRealmScope } from '../realm-scope';
import type { BasePermission, PermissionPolicyBinding } from '../types';
import { AuthorizationCatalogStaleError } from './error';
import { containsBindingCheck, projectAuthorizationPolicy } from './policy';
import { parseAuthorizationEvaluatorInput } from './schema';
import type { AuthorizationEvaluatorInput, AuthorizationPolicy } from './types';

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
 * Build a resource-server (or console) evaluator from the catalog
 * `GET /authorization` serves, the identity's grants as the introspection
 * endpoints report them, and the identity itself. Rejects legacy, incomplete
 * and unsupported input. A grant referencing a definition or a policy the
 * catalog lacks throws `AuthorizationCatalogStaleError`, the signal to
 * refetch the catalog: the grants come from a fresh introspection while the
 * catalog may predate the definition or the junction row. A definition the
 * server could not project travels with `policies: null` instead of being
 * left out, so a grant of it is dropped rather than reported stale: the
 * definition layer cannot be evaluated here, a refetch changes nothing, and
 * the permission denies until the policy is fixed.
 *
 * A tree THIS copy cannot project is the same condition read from the other
 * side, and it is per tree: a policy type newer than this package (the
 * built-in type enum is closed while the column is a free string) or a
 * configuration its validator refuses denies the definitions that reference
 * it, exactly as `policies: null` does, and drops a grant that names it,
 * exactly as a binding check does. One such tree never takes the evaluator
 * down for the permissions that do not use it. A malformed catalog still
 * throws: a duplicate permission namespace is not a data condition.
 *
 * Both the identity and the grants are optional. Without an identity no grant
 * is bound and any IDENTITY key the caller supplied is REMOVED, so the
 * binding evaluator answers with missing data exactly as the server does for
 * an anonymous request, only a definition whose policies need no identity can
 * pass, and a caller can never inject an identity the document did not prove.
 * Grants without the identity they belong to are refused.
 *
 * The REALM_MATCH data key follows the server's own three-way rule: a
 * resource that carries a realm passes it (null for a global row, which
 * `own` denies), a resource with no realm dimension passes nothing and reach
 * neutral-passes. `preEvaluate` / `preEvaluateOneOf` are the pre-gate and
 * enforce reach only when that key is present. `compile` returns the
 * allow/deny/conditional/post contract; a `post` collection query must be
 * rejected or evaluated over every candidate before paging. The supplied
 * identity is authoritative; `options.decisionStrategy` is forwarded and the
 * policy include, exclude and pending options are refused.
 */
export async function createAuthorizationEvaluator(input: AuthorizationEvaluatorInput) : Promise<IPermissionEvaluator> {
    const {
        catalog, 
        grants, 
        identity, 
    } = await parseAuthorizationEvaluatorInput(input);

    const trees = new Map<string, AuthorizationPolicy>();
    const unevaluable = new Set<string>();
    for (const [id, raw] of Object.entries(catalog.policies)) {
        try {
            trees.set(id, await projectAuthorizationPolicy(raw));
        } catch {
            unevaluable.add(id);
        }
    }

    const definitions : PermissionPolicyBinding[] = [];
    const permissions = new Map<string, BasePermission | null>();
    for (const entry of catalog.permissions) {
        const permission : BasePermission = {
            name: entry.name,
            realmId: entry.realm_id,
            clientId: entry.client_id,
            decisionStrategy: entry.decision_strategy ?? undefined,
        };
        const key = buildPermissionKey(permission);
        if (permissions.has(key)) {
            throw new Error(`Duplicate authorization permission: ${key}`);
        }
        if (entry.policies === null || entry.policies.some((id) => unevaluable.has(id))) {
            permissions.set(key, null);
            continue;
        }
        permissions.set(key, permission);

        const policies : BasePolicy[] = [];
        for (const id of entry.policies) {
            const tree = trees.get(id);
            if (!tree) {
                throw new Error(`Unknown authorization policy: ${id}`);
            }
            policies.push(toPolicy(tree));
        }

        definitions.push({ permission, policies: policies.length > 0 ? policies : undefined });
    }

    const bindings : PermissionPolicyBinding[] = [];
    for (const grant of grants) {
        const key = buildPermissionKey({
            name: grant.name,
            realmId: grant.realm_id ?? null,
            clientId: grant.client_id ?? null,
        });
        const permission = permissions.get(key);
        if (typeof permission === 'undefined') {
            throw new AuthorizationCatalogStaleError(`The catalog does not define the permission ${key}.`);
        }
        if (permission === null) {
            continue;
        }

        const policies : BasePolicy[] = [];
        let evaluable = true;
        for (const id of grant.policies ?? []) {
            if (unevaluable.has(id)) {
                evaluable = false;
                break;
            }
            const tree = trees.get(id);
            if (!tree) {
                throw new AuthorizationCatalogStaleError(`The catalog does not declare the policy ${id}.`);
            }
            if (containsBindingCheck(tree)) {
                evaluable = false;
                break;
            }
            policies.push(toPolicy(tree));
        }
        if (!evaluable) {
            continue;
        }

        bindings.push({
            permission,
            realmScope: normalizeRealmScope(grant.realm_scope),
            policies: policies.length > 0 ? policies : undefined,
        });
    }

    const engine = new PolicyEngine(PolicyDefaultEvaluators);
    engine.registerEvaluator(
        BuiltInPolicyType.PERMISSION_BINDING,
        new IdentityPermissionBindingPolicyEvaluator({ getFor: async () => bindings }),
    );
    const evaluator = new PermissionEvaluator({
        provider: new PermissionMemoryProvider(definitions),
        policyEngine: engine,
    });

    const withIdentity = (input?: PolicyData) : PolicyData => {
        const data = input?.clone() ?? new PolicyData();
        if (!identity) {
            // symmetrical with the branch below, which overwrites the key:
            // the document proved no identity, so the caller may not supply
            // one either
            data.delete(BuiltInPolicyType.IDENTITY);

            return data;
        }

        data.set(BuiltInPolicyType.IDENTITY, {
            id: identity.id,
            type: identity.type,
            realmId: identity.realmId ?? undefined,
            realmName: identity.realmName ?? undefined,
            clientId: identity.clientId ?? null,
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
        if (next.data!.has(BuiltInPolicyType.REALM_MATCH)) {
            realmMatchSchema.parse(next.data!.get(BuiltInPolicyType.REALM_MATCH));
        }

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
