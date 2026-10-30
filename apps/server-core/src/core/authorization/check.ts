/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    AuthorizationCheckClients,
    AuthorizationCheckPermission,
    AuthorizationCheckPermissions,
    AuthorizationCheckRealms,
    AuthorizationCheckTargetRealms,
    BasePermission,
    BasePolicy,
    IPermissionEvaluator,
    IdentityPolicyData,
    PermissionPolicyBinding,
} from '@authup/access';
import {
    AUTHORIZATION_CHECK_GRANTED,
    BuiltInPolicyType,
    IdentityPermissionBindingPolicyEvaluator,
    PermissionEvaluator,
    PermissionMemoryProvider,
    PolicyDefaultEvaluators,
    PolicyEngine,
    RealmScope,
    buildPermissionKey,
    createPolicyTransitionCollector,
    definePolicyData,
    isPermissionError,
    isPolicyError,
} from '@authup/access';
import { normalizeError } from '@authup/errors';
import { DecisionStrategy } from '@authup/kit';
import type {
    AuthorizationCheckBuilderContext,
    AuthorizationCheckRequest,
    AuthorizationCheckResult,
} from './types.ts';

/**
 * Deduplicate a verbatim selector list: a repeated entry would cost an
 * evaluation and be answered twice, and a caller repeating one asks the same
 * question.
 */
function dedupe(items: Array<string | null | undefined>) : Array<string | null> {
    return [...new Set<string | null>(items.map((item) => item ?? null))];
}

/**
 * Resolve a target realm selector: the resource realms each definition is
 * checked against.
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
function resolveTargetRealms(
    realms: AuthorizationCheckTargetRealms,
    identity?: IdentityPolicyData,
) : Array<string | null> {
    if (Array.isArray(realms)) {
        return dedupe(realms);
    }

    const own = identity?.realmId ?? null;

    if (realms === RealmScope.OWN) {
        return own === null ? [] : [own];
    }

    return own === null ? [null] : [own, null];
}

/**
 * Resolve an owner selector, realm or client alike, given what `own` names
 * (`null` when there is nothing to name) and the owners the identity's grants
 * name.
 *
 * - `own`: the own owner, or nothing.
 * - `ownOrNull`: `own` plus `null`.
 * - `granted`: the owners of every definition the identity holds a grant of,
 *   plus `ownOrNull`. The grants are the request's own (a user's are
 *   narrowed to the token client, #3597), so it reaches exactly the owned
 *   definitions the request can be granted.
 * - a list: taken verbatim, deduplicated.
 */
function resolveOwners(
    selector: AuthorizationCheckRealms | AuthorizationCheckClients,
    own: string | null,
    granted: () => Array<string | null | undefined>,
) : Array<string | null> {
    if (Array.isArray(selector)) {
        return dedupe(selector);
    }

    const owners : Array<string | null> = own === null ? [] : [own];

    if (selector === RealmScope.OWN) {
        return owners;
    }

    owners.push(null);

    if (selector === AUTHORIZATION_CHECK_GRANTED) {
        for (const owner of granted()) {
            if (owner) {
                owners.push(owner);
            }
        }
    }

    return dedupe(owners);
}

/**
 * Whether a policy settles false for a caller holding no grant for the
 * permission, whatever else the evaluation bag says: a non-inverted binding
 * check, reached only through non-inverted composites that cannot pass without
 * it (UNANIMOUS: any such child; AFFIRMATIVE: every child). Anything else,
 * inverted or CONSENSUS included, answers false, which only ever keeps a
 * transition that could have been dropped.
 */
function deniesWithoutGrant(policy: BasePolicy & Record<string, any>) : boolean {
    if (policy.invert) {
        return false;
    }

    if (policy.type === BuiltInPolicyType.PERMISSION_BINDING) {
        return true;
    }

    if (policy.type !== BuiltInPolicyType.COMPOSITE || !Array.isArray(policy.children) || policy.children.length === 0) {
        return false;
    }

    const strategy = policy.decisionStrategy ?? DecisionStrategy.UNANIMOUS;

    if (strategy === DecisionStrategy.UNANIMOUS) {
        return policy.children.some((child: BasePolicy) => deniesWithoutGrant(child));
    }

    if (strategy === DecisionStrategy.AFFIRMATIVE) {
        return policy.children.every((child: BasePolicy) => deniesWithoutGrant(child));
    }

    return false;
}

/**
 * Evaluate the caller's own permissions against the requested target realms
 * and answer the pairs that hold.
 *
 * Cost is what makes this shape possible. `PermissionEvaluator` resolves a
 * definition per name, and the database provider's `findOne` carries an
 * uncached junction read plus a tree walk each. Run that way per name it is
 * hundreds of statements for one request, on a route a UI calls at every
 * login.
 *
 * So the definitions are read ONCE in bulk through the same `findDefinitions`
 * the catalog uses and served from memory, and the caller's grants, loaded
 * once by the controller, ride on its identity into every evaluation. Two
 * bulk reads plus one grant load, and the rest is in memory.
 *
 * Which definitions are evaluated is the request's `realms` and `clients`: a
 * definition is identified by (name, realmId, clientId), so the realm and the
 * client OWNING it are a namespace, kept apart from the target realm it is
 * checked against. Every piece of state below is keyed by that triple
 * (`buildPermissionKey`), and each evaluation names the definition's realm
 * and client, so the memory provider resolves that definition rather than a
 * same-named global one. Selecting another client's definitions discloses
 * nothing: the grants are the request's own, narrowed the way every gate of
 * the request reads them (#3597).
 *
 * `request.decorate` is what keeps this honest about the caller's SCOPES.
 * server-core attaches identity policy data only when the credential's scopes
 * include `global`, and rebuilding that condition here would be a second
 * place for it to drift: a scope-restricted bearer would be answered a passing
 * set that every real request denies. The controller passes the request
 * evaluator's own wrapper, so the condition is inherited rather than restated.
 *
 * A `date` or `time` policy settles against the clock, so the answer is a
 * snapshot. Every (definition, target realm) pair hands a collector of its
 * own down the walk it already runs, and `expiresAt` is the earliest instant
 * among the pairs whose clock could actually move THIS caller's answer (see
 * `affectsCaller`). It is absent when no such pair depends on the clock.
 */
export async function buildAuthorizationCheck(
    ctx: AuthorizationCheckBuilderContext,
    request: AuthorizationCheckRequest,
) : Promise<AuthorizationCheckResult> {
    const heldGrants = request.identity?.grants ?? [];
    const realms = new Set(resolveOwners(
        request.realms ?? [null],
        request.identity?.realmId ?? null,
        () => heldGrants.map((grant) => grant.permission.realmId),
    ));
    const clients = new Set(resolveOwners(
        request.clients ?? [null],
        request.clientId ?? null,
        () => heldGrants.map((grant) => grant.permission.clientId),
    ));
    const names = request.names ? new Set(request.names) : undefined;

    const definitions = await ctx.catalogRepository.findDefinitions();

    const bindings : PermissionPolicyBinding[] = [];
    const selected : BasePermission[] = [];
    const grantGated = new Set<string>();

    for (const [permission, policies] of definitions) {
        if (
            !realms.has(permission.realmId ?? null) ||
            !clients.has(permission.clientId ?? null) ||
            (names && !names.has(permission.name))
        ) {
            continue;
        }

        bindings.push({
            permission,
            policies: policies.length > 0 ? policies : undefined,
        });
        selected.push(permission);

        // The definition's policies are combined under its own decision
        // strategy, the way the evaluator composes them.
        if (policies.length > 0 && deniesWithoutGrant({
            type: BuiltInPolicyType.COMPOSITE,
            decisionStrategy: permission.decisionStrategy || DecisionStrategy.UNANIMOUS,
            children: policies,
        })) {
            grantGated.add(buildPermissionKey(permission));
        }
    }

    const targetRealms = resolveTargetRealms(request.targetRealms ?? RealmScope.OWN_OR_NULL, request.identity);

    if (selected.length === 0 || targetRealms.length === 0) {
        return { permissions: [] };
    }

    // Present only when policies may see the identity: a caller whose scopes
    // withhold it holds no grant a verdict could read.
    const grants = request.identity?.grants;

    const policyEngine = new PolicyEngine(PolicyDefaultEvaluators);

    policyEngine.registerEvaluator(
        BuiltInPolicyType.PERMISSION_BINDING,
        new IdentityPermissionBindingPolicyEvaluator(),
    );

    // Whether the clock of a DENIED pair can move this caller's answer. Held
    // pairs always can. A denied one can unless its definition denies every
    // caller holding no grant for it (`deniesWithoutGrant`) and this caller
    // holds none: then the pair is denied for want of a grant whatever the
    // clock says, and its window would only disclose the boundaries of a
    // permission the caller cannot hold, and have it refetch at them for
    // nothing. Every other denied pair keeps its transition, so no report
    // that could matter is dropped.
    const affectsCaller = async (key: string) : Promise<boolean> => {
        if (!grantGated.has(key)) {
            return true;
        }

        if (!grants) {
            return false;
        }

        return grants.some((grant) => buildPermissionKey(grant.permission) === key);
    };

    const evaluator : IPermissionEvaluator = request.decorate(new PermissionEvaluator({
        provider: new PermissionMemoryProvider(bindings),
        policyEngine,
    }));

    const transitions = createPolicyTransitionCollector();

    const result : AuthorizationCheckPermissions = [];

    for (const permission of selected) {
        const { name } = permission;
        const realmId = permission.realmId ?? null;
        const clientId = permission.clientId ?? null;
        const key = buildPermissionKey(permission);

        const held : Array<string | null> = [];

        for (const targetRealm of targetRealms) {
            const pairTransitions = createPolicyTransitionCollector();
            let passed = false;

            try {
                await evaluator.preEvaluate({
                    name,
                    // The definition's own namespace, or the provider would
                    // resolve a same-named global definition instead.
                    realmId,
                    clientId,
                    // The identity, with its grants, is placed by `decorate`,
                    // which asserts the one the request was resolved as, or
                    // none when the caller's scopes withhold it.
                    data: definePolicyData({ [BuiltInPolicyType.REALM_MATCH]: targetRealm }),
                    options: { transitions: pairTransitions },
                });

                held.push(targetRealm);
                passed = true;
            } catch (e) {
                // A denial is the answer, and so is a policy the engine refused
                // to evaluate, which denies but says so. Anything else never
                // reached a verdict: the decorator loads the request's grants,
                // and a failed read there is infrastructure, not an answer, so
                // it fails the request rather than becoming an authoritative
                // empty set the kit memoizes.
                if (!isPermissionError(e) && !isPolicyError(e)) {
                    throw normalizeError(e);
                }

                if (isPolicyError(e)) {
                    ctx.logger?.warn(
                        `Treated ${key} as denied in realm ${targetRealm ?? 'global'} while building the ` +
                        `authorization check: ${e.message}.`,
                    );
                }
            }

            if (
                pairTransitions.next &&
                (passed || await affectsCaller(key))
            ) {
                transitions.report(pairTransitions.next);
            }
        }

        if (held.length > 0) {
            result.push({
                name,
                ...(realmId ? { realmId } : {}),
                ...(clientId ? { clientId } : {}),
                targetRealms: held,
            } satisfies AuthorizationCheckPermission);
        }
    }

    return {
        permissions: result,
        ...(transitions.next ? { expiresAt: transitions.next } : {}),
    };
}
