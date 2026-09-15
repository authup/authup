/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    AuthorizationCheckPermission,
    AuthorizationCheckResult,
    IPermissionEvaluator,
    IdentityPolicyData,
    PermissionPolicyBinding,
} from '@authup/access';
import {
    BuiltInPolicyType,
    IdentityPermissionBindingPolicyEvaluator,
    PermissionEvaluator,
    PermissionMemoryProvider,
    PolicyDefaultEvaluators,
    PolicyEngine,
    RealmScope,
    definePolicyData,
    isPermissionError,
} from '@authup/access';
import type {
    AuthorizationCheckBuilderContext,
    AuthorizationCheckRequest,
} from './types.ts';

/**
 * Resolve the realms to evaluate against.
 *
 * A symbolic selector is resolved against the caller's own identity, so a
 * caller needs to know nothing about itself to ask the question it means. An
 * explicit list is taken VERBATIM: nothing here resolves a realm key, so the
 * answer discloses no realm's existence and a caller matches it against its
 * own input with no resolution step.
 *
 * A realm-less identity has no own realm to name, so `own` resolves to nothing
 * at all and `ownOrNull` to the global rows alone. That needs no special case
 * further down: `realmScopeMatches` already denies such an identity every
 * scope but `any`, so the verdicts come out the same way either route.
 */
function resolveRealms(
    request: AuthorizationCheckRequest,
) : Array<string | null> {
    const { realms } = request;

    if (Array.isArray(realms)) {
        // Deduplicate: a repeated realm would cost an evaluation and be
        // answered twice, and a caller repeating one asks the same question.
        return [...new Set<string | null>(realms.map((realm) => realm ?? null))];
    }

    const own = request.identity?.realmId ?? null;
    if (realms === RealmScope.OWN) {
        return own === null ? [] : [own];
    }

    return own === null ? [null] : [own, null];
}

/**
 * Evaluate the caller's own permissions against the requested realms and
 * answer the pairs that hold.
 *
 * Cost is what makes this shape possible. `PermissionEvaluator` resolves a
 * definition per name, and the database provider's `findOne` carries an
 * uncached junction read plus a tree walk each, while the binding evaluator
 * re-reads the identity's grants on every evaluation. Run that way per name it
 * is hundreds of statements for one request, on a route a UI calls at every
 * login.
 *
 * So the definitions are read ONCE in bulk through the same `findDefinitions`
 * the catalog uses and served from memory, and the grant load is hoisted into
 * one memoized closure behind the structural `getFor` the binding evaluator
 * takes. Two bulk reads plus one grant load, and the rest is in memory.
 *
 * Only GLOBAL definitions are evaluated, because that is what every gate in
 * this process evaluates: a request resolves a permission with a null realm
 * and a null client, so a realm- or client-scoped row is no more reachable by
 * a check than by a gate.
 *
 * `request.decorate` is what keeps this honest about the caller's SCOPES.
 * server-core attaches identity policy data only when the credential's scopes
 * include `global`, and rebuilding that condition here would be a second
 * place for it to drift: a scope-restricted bearer would be answered a passing
 * set that every real request denies. The controller passes the request
 * evaluator's own wrapper, so the condition is inherited rather than restated.
 */
export async function buildAuthorizationCheck(
    ctx: AuthorizationCheckBuilderContext,
    request: AuthorizationCheckRequest,
) : Promise<AuthorizationCheckResult> {
    const definitions = await ctx.catalogRepository.findDefinitions();

    const bindings : PermissionPolicyBinding[] = [];
    const names : string[] = [];
    for (const [permission, policies] of definitions) {
        if (permission.realmId || permission.clientId) {
            continue;
        }

        bindings.push({
            permission,
            policies: policies.length > 0 ? policies : undefined,
        });
        names.push(permission.name);
    }

    // A requested name with no global definition is left in: the evaluator
    // denies it by itself, and dropping it here would only move the same
    // absence one step earlier.
    const requested = request.names ?
        [...new Set(request.names)] :
        names;

    const realms = resolveRealms(request);
    if (requested.length === 0 || realms.length === 0) {
        return [];
    }

    let grants : Promise<PermissionPolicyBinding[]> | undefined;
    const policyEngine = new PolicyEngine(PolicyDefaultEvaluators);
    policyEngine.registerEvaluator(
        BuiltInPolicyType.PERMISSION_BINDING,
        new IdentityPermissionBindingPolicyEvaluator({
            getFor: (identity: IdentityPolicyData) => {
                grants = grants || ctx.identityPermissionProvider.getFor(identity);

                return grants;
            },
        }),
    );

    const evaluator : IPermissionEvaluator = request.decorate(new PermissionEvaluator({
        provider: new PermissionMemoryProvider(bindings),
        policyEngine,
    }));

    const result : AuthorizationCheckResult = [];
    for (const name of requested) {
        const held : Array<string | null> = [];

        for (const realm of realms) {
            try {
                await evaluator.preEvaluate({
                    name,
                    data: definePolicyData({
                        // Every policy in the tree that reads the identity gets
                        // it, not only the permission-binding child: an
                        // `identity` or attribute-mode `realmMatch` policy bound
                        // to a definition is evaluated here exactly as a request
                        // evaluates it. `decorate` re-asserts the key from the
                        // REQUEST, and removes it when the caller's scopes
                        // withhold it, so this can widen nothing: it is the
                        // identity the caller was resolved as or none at all.
                        ...(request.identity ?
                            { [BuiltInPolicyType.IDENTITY]: request.identity } :
                            {}),
                        [BuiltInPolicyType.REALM_MATCH]: realm,
                    }),
                });

                held.push(realm);
            } catch (e) {
                // A denial is the answer. Anything else denies too, but says
                // so: the grant load is memoized into one promise, so a single
                // failed read denies every pair at once and the route would
                // otherwise answer an authoritative empty set with nothing in
                // the log, which a consumer then memoizes for its session.
                if (!isPermissionError(e)) {
                    ctx.logger?.warn(
                        `Treated ${name} as denied in realm ${realm ?? 'global'} while building the authorization ` +
                        `check: ${e instanceof Error ? e.message : String(e)}.`,
                    );
                }
            }
        }

        if (held.length > 0) {
            result.push({ name, realms: held } satisfies AuthorizationCheckPermission);
        }
    }

    return result;
}
