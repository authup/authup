/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isEqual } from 'smob';
import type { BasePolicy } from '../../policy';
import { compareRealmScope } from '../realm-scope';
import type { PermissionGrant } from '../types';

/**
 * Policy fields that do NOT affect evaluation — persisted identity, audit and label columns plus
 * the loaded `parent` / `realm` relation objects. They are stripped before the structural compare
 * in isPolicyEquivalent so two DISTINCT rows with identical configuration still match. Verified
 * against every built-in evaluator, which read only `type`, `invert`, `decisionStrategy`,
 * `children` and the type-specific config (query / names / types / start / end / interval /
 * dayOf* / attributeName* / scope). `parent` is additionally a circular back-reference and
 * `realm` a nested object with its own id, so leaving either in would break the deep compare.
 *
 * SECURITY INVARIANT: every key here MUST stay non-evaluation-affecting. Adding an
 * evaluation-relevant field would silently widen equivalence into an over-permit. New *config*
 * fields need NOT be added — they are compared by default, which is the fail-closed direction.
 */
const NON_SEMANTIC_POLICY_KEYS = new Set<string>([
    'id',
    'builtIn',
    'name',
    'displayName',
    'description',
    'parentId',
    'parent',
    'realmId',
    'realm',
    'createdAt',
    'updatedAt',
]);

/**
 * Project a policy node onto its evaluation-relevant configuration: drop the non-semantic keys
 * and recurse through `children` (the only field that carries nested policy nodes). Config values
 * (e.g. an `attributes` `query`) are left untouched, so a semantic `id` / `name` key *inside* a
 * query is never mistaken for the policy's own identity column.
 */
function normalizePolicyForEquality(policy: BasePolicy): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(policy as Record<string, unknown>)) {
        if (NON_SEMANTIC_POLICY_KEYS.has(key)) {
            continue;
        }

        if (
            key === 'children' &&
            Array.isArray(value)
        ) {
            result[key] = value.map((child) => normalizePolicyForEquality(child as BasePolicy));
            continue;
        }

        result[key] = value;
    }

    return result;
}

/**
 * Whether two restriction policies are provably the SAME policy for domination purposes — by
 * persisted identity OR by identical configuration, never by evaluated effect. Fast path: equal
 * primary-key `id` means the same persisted row (the `typeof … === 'string'` guards keep an
 * id-less / missing-id policy out of it — never `undefined === undefined`). Otherwise fall back to
 * a structural value-compare of the configuration (`normalizePolicyForEquality` strips the
 * non-semantic identity / audit / relation columns, `isEqual` deep-compares the rest), so two
 * distinct rows with identical config — the same predicate — still dominate. Comparing by
 * *effect* is undecidable (a policy is a predicate over PolicyData), so we accept ONLY provable
 * identity or provable structural equality; a genuinely different configuration is treated as
 * distinct (fail-closed) — isSuperset must never assume one restriction covers a different one.
 */
function isPolicyEquivalent(parent: BasePolicy, child: BasePolicy): boolean {
    const parentId = (parent as { id?: unknown }).id;
    const childId = (child as { id?: unknown }).id;

    if (
        typeof parentId === 'string' &&
        typeof childId === 'string' &&
        parentId === childId
    ) {
        return true;
    }

    return isEqual(normalizePolicyForEquality(parent), normalizePolicyForEquality(child));
}

/**
 * Whether the actor's `parent` policy provably covers the target's `child` policy on a shared
 * permission. Conservative / fail-closed:
 *  - an unrestricted parent (no policy) covers any child;
 *  - a restricted parent NEVER covers an unrestricted child — it cannot confer the wider,
 *    policy-free reach it does not itself hold;
 *  - two restricted grants cover one another only when their policies are provably equivalent.
 *    A DIFFERENT policy is NOT assumed to be a subset (#3159: the predecessor treated any two
 *    policy-bound grants as mutually dominating, a latent over-permit across disjoint policy
 *    scopes — e.g. an actor restricted to `department=X` conferring a `department=Y` grant).
 */
function policyDominates(parent?: BasePolicy, child?: BasePolicy): boolean {
    if (!parent) {
        return true;
    }

    if (!child) {
        return false;
    }

    return isPolicyEquivalent(parent, child);
}

/**
 * Whether the actor's `parent` grant covers the target's `child` grant: it reaches at least as
 * far (ordered none < own < ownOrNull < any) AND its policy provably covers the child's
 * (see `policyDominates`). Used per grant by `isSuperset` over the aggregated disjunction —
 * every child grant must be dominated by SOME parent grant.
 */
export function grantDominates(parent: PermissionGrant, child: PermissionGrant): boolean {
    if (compareRealmScope(parent.realmScope, child.realmScope) < 0) {
        return false;
    }

    return policyDominates(parent.policy, child.policy);
}
