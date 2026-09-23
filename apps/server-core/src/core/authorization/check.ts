/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    AuthorizationCheckPermission,
    AuthorizationCheckPermissions,
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
    createPolicyTransitionCollector,
    definePolicyData,
    isPermissionError,
} from '@authup/access';
import { normalizeError } from '@authup/errors';
import type {
    AuthorizationCheckBuilderContext,
    AuthorizationCheckRequest,
    AuthorizationCheckResult,
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
 *
 * A `date` or `time` policy settles against the clock, so the answer is a
 * snapshot. Every evaluation hands the same transition collector down the
 * walk it already runs, and `expiresAt` is the earliest instant any evaluated
 * clock policy could flip, so a consumer knows when to ask again. It is absent
 * when no evaluated verdict depends on the clock.
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
        return { permissions: [] };
    }

    let grants : Promise<PermissionPolicyBinding[]> | undefined;

    // The grant load is the one failure a verdict cannot be derived from, and
    // it is INVISIBLE to the catch below: `PolicyEngine.evaluate` turns every
    // evaluator throw into issues and `PermissionEvaluator` re-raises those as
    // a `PermissionError`, so by the time a rejected read arrives there it is
    // indistinguishable from a denial. Left that way the route answers an
    // authoritative empty set with a 200 and no log line, and a consumer
    // memoizes it: the kit keys its memo on the introspection's subject, scope
    // and grants, none of which a cache or database hiccup moves, so one
    // failed read gates a console closed for the rest of the document's life.
    //
    // So the rejection is kept here and re-raised, which is what lets the
    // caller retry: the kit clears its memo on a rejection and asks again on
    // the next resolve.
    let grantsError : unknown;
    let grantsFailed = false;

    const policyEngine = new PolicyEngine(PolicyDefaultEvaluators);
    policyEngine.registerEvaluator(
        BuiltInPolicyType.PERMISSION_BINDING,
        new IdentityPermissionBindingPolicyEvaluator({
            getFor: (identity: IdentityPolicyData) => {
                if (!grants) {
                    grants = request.grants(identity)
                        .catch((e) => {
                            grantsFailed = true;
                            grantsError = e;

                            throw e;
                        });
                }

                return grants;
            },
        }),
    );

    const evaluator : IPermissionEvaluator = request.decorate(new PermissionEvaluator({
        provider: new PermissionMemoryProvider(bindings),
        policyEngine,
    }));

    const transitions = createPolicyTransitionCollector();

    const result : AuthorizationCheckPermissions = [];
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
                    options: { transitions },
                });

                held.push(realm);
            } catch (e) {
                // A denial is the answer. The one failure that must NOT be
                // read as one is the grant load, and it is caught above
                // rather than here, since the engine has already flattened it
                // into a `PermissionError` by the time it arrives. What is
                // left for this guard is a throw the engine never saw -- a
                // decorator or a policy-data access -- which denies, but says
                // so rather than passing for a verdict.
                if (!isPermissionError(e)) {
                    ctx.logger?.warn(
                        `Treated ${name} as denied in realm ${realm ?? 'global'} while building the authorization ` +
                        `check: ${e instanceof Error ? e.message : String(e)}.`,
                    );
                }
            }

            // Raised on the first pair that hits it rather than after the
            // whole matrix: the promise is memoized, so every remaining pair
            // would fail the same way for the same reason.
            if (grantsFailed) {
                throw normalizeError(grantsError);
            }
        }

        if (held.length > 0) {
            result.push({ name, realms: held } satisfies AuthorizationCheckPermission);
        }
    }

    return {
        permissions: result,
        ...(transitions.next ? { expiresAt: transitions.next } : {}),
    };
}
