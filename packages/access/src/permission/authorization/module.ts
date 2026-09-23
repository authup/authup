/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { type Issue, defineIssueItem, prefixIssuePath } from '@ebec/core';
import { InternalError } from '@authup/errors';
import { buildIssuesForZodError } from '@validup/zod';
import { ValidupError } from 'validup';
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
import { PermissionError } from '../error';
import { buildPermissionKey } from '../helpers';
import { PermissionMemoryProvider } from '../provider';
import { normalizeRealmScope } from '../realm-scope';
import type { BasePermission, PermissionPolicyBinding } from '../types';
import { AuthorizationCatalogStaleError } from './error';
import { containsBindingCheck, projectAuthorizationPolicy } from './policy';
import { parseAuthorizationCheckEvaluatorInput } from './check-schema';
import { parseAuthorizationEvaluatorInput } from './schema';
import type {
    AuthorizationCheckEvaluatorInput,
    AuthorizationEvaluatorInput,
    AuthorizationEvaluatorOptions,
    AuthorizationPolicy,
} from './types';

/**
 * Every value `realmScopeMatches` decides, and nothing it would have to guess
 * at (#3636): a realm key, `null` for a global row, or a list of either for a
 * row spanning several realms. An empty key and an empty list are legal and
 * DENY there (no identity's realm is the empty string, and the empty set is
 * fail-closed), so refusing them here would make the consumer the one side
 * that errors where the server answers. `undefined` stays refused: the server
 * coerces it to `null`, which reads as a global row, and a caller passing an
 * absent column should hear about it rather than reach the global rows.
 */
const realmMatchSchema = z.union([z.string(), z.array(z.string().nullable()), z.null()]);

/**
 * Every refusal of the DOCUMENT is a `ValidupError` carrying the path of the
 * member at fault, the shape `parseAuthorizationEvaluatorInput` raises and the
 * one a consumer can render. A bare `Error` carries neither a code nor a path,
 * so nothing downstream can normalize it.
 */
function refuseDocument(message: string, path: PropertyKey[]) : never {
    throw new ValidupError([defineIssueItem({ message, path })]);
}

function refuseDocumentWithIssues(issues: Issue[]) : never {
    throw new ValidupError(issues);
}

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
 * side, and it is per tree: a policy type the validator registry lacks (a
 * type newer than this package, or a custom one the caller did not register)
 * or a configuration its validator refuses denies the definitions that reference
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
 *
 * The policy type set is open (#3635): `options.validators` decides which
 * trees project and `options.evaluators` how they evaluate, the built-in
 * registries by default. A custom type needs both, the validator the server
 * projected it with and the evaluator the server decides it with; given only
 * the first it projects and then denies. The binding evaluator is always this
 * function's own, since it is what binds the introspected grants.
 */
export async function createAuthorizationEvaluator(
    input: AuthorizationEvaluatorInput,
    options: AuthorizationEvaluatorOptions = {},
) : Promise<IPermissionEvaluator> {
    const {
        catalog, 
        grants, 
        identity, 
    } = await parseAuthorizationEvaluatorInput(input);

    const trees = new Map<string, AuthorizationPolicy>();
    const unevaluable = new Set<string>();
    for (const [id, raw] of Object.entries(catalog.policies)) {
        try {
            trees.set(id, await projectAuthorizationPolicy(raw, options.validators));
        } catch {
            unevaluable.add(id);
        }
    }

    const definitions : PermissionPolicyBinding[] = [];
    const permissions = new Map<string, BasePermission | null>();
    for (const [index, entry] of catalog.permissions.entries()) {
        const permission : BasePermission = {
            name: entry.name,
            realmId: entry.realm_id,
            clientId: entry.client_id,
            decisionStrategy: entry.decision_strategy ?? undefined,
        };
        const key = buildPermissionKey(permission);
        if (permissions.has(key)) {
            refuseDocument(
                `The catalog defines the permission ${key} more than once.`,
                ['catalog', 'permissions', index],
            );
        }
        if (entry.policies === null || entry.policies.some((id) => unevaluable.has(id))) {
            permissions.set(key, null);
            continue;
        }
        permissions.set(key, permission);

        const policies : BasePolicy[] = [];
        for (const [i, id] of entry.policies.entries()) {
            const tree = trees.get(id);
            if (!tree) {
                refuseDocument(
                    `The catalog does not declare the policy ${id}.`,
                    ['catalog', 'permissions', index, 'policies', i],
                );
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

    const engine = new PolicyEngine(options.evaluators ?? PolicyDefaultEvaluators);
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
            throw new InternalError('The authorization evaluator does not accept policy bypass options.');
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
            const value = next.data!.get(BuiltInPolicyType.REALM_MATCH);
            const outcome = realmMatchSchema.safeParse(value);
            if (!outcome.success) {
                refuseDocumentWithIssues(
                    buildIssuesForZodError(outcome.error, value)
                        .map((issue) => prefixIssuePath(issue, ['data', BuiltInPolicyType.REALM_MATCH])),
                );
            }
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
                throw new InternalError('Compile authorization without resource realm or row attributes.');
            }

            return evaluator.compile({
                name: ctx.name,
                realmId: ctx.realmId,
                clientId: ctx.clientId,
                data: withIdentity(ctx.data),
                realmAttributeName: ctx.realmAttributeName,
            });
        },
    };
}

/**
 * An `IPermissionEvaluator` over the answer `POST /authorization/check`
 * served: the caller's own verdicts, paired with the realms they hold in.
 *
 * It is what a PUBLIC client gets where the catalog is out of reach. A public
 * client holds no secret, so it can obtain no `client_credentials` token and
 * has no credential of its own for the catalog's gate to be satisfied by;
 * publishing every policy predicate to it instead would be the wrong trade.
 * The verdicts are computed by the server from the same grants and the same
 * evaluators a request runs, so this is authoritative where the name-only
 * fallback it replaces is merely coarse.
 *
 * Two properties follow from the answer being a pre-gate:
 *
 * It is an UPPER BOUND, so `evaluate` and `evaluateOneOf` answer exactly what
 * the pre-gate pair answers. A check that depends on a resource row belongs to
 * whoever holds the row, and the server decides it there; answering such a
 * check here would mean inventing a verdict. That is the same bound the
 * name-only fallback already had, so nothing that gates on it loosens.
 *
 * And a resource realm is matched against what the REQUEST asked about: a
 * `realmMatch` naming a realm the request never carried is in no entry's list
 * and therefore denies. That is fail-closed by construction rather than by a
 * rule, and it is why a caller must ask about the realms its UI will ask
 * about.
 */
export async function createAuthorizationCheckEvaluator(
    input: AuthorizationCheckEvaluatorInput,
) : Promise<IPermissionEvaluator> {
    const { permissions, identity } = await parseAuthorizationCheckEvaluatorInput(input);

    const verdicts = new Map<string, Set<string | null>>();
    for (const permission of permissions) {
        verdicts.set(permission.name, new Set<string | null>(permission.realms));
    }

    // The server resolves `own` / `ownOrNull` to the identity's realm ID, while
    // a caller may name its own realm either way: the reach comparison the
    // server makes accepts the id or the name, so the consumer has to as well,
    // or a check carrying the realm NAME would deny against an answer keyed by
    // the id.
    const ownKeys = new Set<string>();
    if (identity?.realmId) {
        ownKeys.add(identity.realmId);
    }
    if (identity?.realmName) {
        ownKeys.add(identity.realmName);
    }

    const matchesRealm = (realms: Set<string | null>, value: string | null) : boolean => {
        if (realms.has(value)) {
            return true;
        }

        if (value === null || !ownKeys.has(value)) {
            return false;
        }

        for (const key of ownKeys) {
            if (realms.has(key)) {
                return true;
            }
        }

        return false;
    };

    const holds = (name: string, data?: PolicyData) : boolean => {
        const realms = verdicts.get(name);
        if (!realms) {
            return false;
        }

        if (!data || !data.has(BuiltInPolicyType.REALM_MATCH)) {
            // No resource realm named, so the question is whether the
            // permission is held at all, which it is: an entry only exists
            // when at least one requested realm passed.
            return true;
        }

        const value = data.get<string | string[] | null>(BuiltInPolicyType.REALM_MATCH);
        if (Array.isArray(value)) {
            // A resource spanning several realms needs every one of them,
            // fail-closed on the empty set, the rule `realmScopeMatches` applies.
            if (value.length === 0) {
                return false;
            }

            return value.every((entry) => matchesRealm(realms, entry ?? null));
        }

        return matchesRealm(realms, value ?? null);
    };

    const names = (ctx: PermissionEvaluationContext) : string[] => (Array.isArray(ctx.name) ?
        ctx.name :
        [ctx.name]);

    const assertEvery = async (ctx: PermissionEvaluationContext) : Promise<void> => {
        for (const name of names(ctx)) {
            if (!holds(name, ctx.data)) {
                throw PermissionError.evaluationFailed(ctx.name);
            }
        }
    };

    const assertSome = async (ctx: PermissionEvaluationContext) : Promise<void> => {
        const list = names(ctx);
        for (const name of list) {
            if (holds(name, ctx.data)) {
                return;
            }
        }

        throw PermissionError.evaluationFailed(ctx.name);
    };

    return {
        evaluate: assertEvery,
        evaluateOneOf: assertSome,
        preEvaluate: assertEvery,
        preEvaluateOneOf: assertSome,
        async compile(ctx: PermissionCompileContext) : Promise<PermissionCompileResult> {
            // A verdict set carries no row predicate, so nothing here can be
            // lowered into a query. `deny` is still sound and worth answering:
            // a name held in no requested realm cannot match a row either.
            const list = Array.isArray(ctx.name) ? ctx.name : [ctx.name];
            if (list.some((name) => holds(name, ctx.data))) {
                return { verdict: 'post' };
            }

            return { verdict: 'deny' };
        },
    };
}
