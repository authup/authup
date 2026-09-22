/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    AuthorizationCatalog,
    AuthorizationDefinition,
    AuthorizationPolicy,
    BasePolicy,
} from '@authup/access';
import {
    AUTHORIZATION_POLICY_WITHHELD_TYPE,
    buildPermissionKey,
    projectAuthorizationPolicy,
} from '@authup/access';
import { InternalError } from '@authup/errors';
import type { AuthorizationCatalogBuilderContext, AuthorizationRealmReach } from './types.ts';

type PolicyDrop = {
    policyId: string | undefined,
    message: string,
};

export function readPolicyId(policy: BasePolicy) : string {
    const { id } = policy as { id?: unknown };
    if (typeof id !== 'string' || id.length === 0) {
        throw new InternalError('An authorization policy tree must carry its id.');
    }

    return id;
}

/**
 * A row's own realm, `undefined` when it carries no such column. Absent is NOT
 * global: every loader hands the builder whole rows, so a node without the
 * column is a row this build cannot place, and placing it globally would make
 * it reachable by every caller holding `ownOrNull`.
 */
function readRealmId(row: BasePolicy) : string | null | undefined {
    const { realmId } = row as { realmId?: unknown };
    if (typeof realmId === 'string') {
        return realmId;
    }

    return realmId === null ? null : undefined;
}

/**
 * Every realm a tree touches, its children included. A child row carries its
 * own `realmId` and nothing pins it to its parent's (`PolicyService.save`
 * checks only that the parent is a composite), so a reachable composite can
 * hold a child of a realm the caller may not read, and the child's
 * configuration travels inside the parent's projection.
 */
function collectRealmIds(tree: BasePolicy, into: Set<string | null | undefined>) : Set<string | null | undefined> {
    into.add(readRealmId(tree));

    const { children } = tree as { children?: BasePolicy[] };
    for (const child of children ?? []) {
        collectRealmIds(child, into);
    }

    return into;
}

function compareKeys(a: string, b: string) : number {
    if (a < b) {
        return -1;
    }

    return a > b ? 1 : 0;
}

function definitionKey(definition: AuthorizationDefinition) : string {
    return buildPermissionKey({
        name: definition.name,
        realmId: definition.realm_id,
        clientId: definition.client_id,
    });
}

/**
 * The catalog is built for ONE caller, narrowed to the realms its own read
 * grant reaches, because `GET /permissions` and `GET /policies` narrow the
 * same rows the same way (#3593) and this route aggregates them.
 *
 * What reach removes is the policy CONFIGURATION, never an entry: a definition
 * out of reach travels with `policies: null`, the tombstone an unprojectable
 * one already uses, and a policy tree out of reach travels as a node no
 * consumer can project. Both tell a consumer the same thing, deny this one and
 * drop its grants, and both keep the key space whole. An ABSENT definition
 * has to keep meaning exactly one thing, that the caller's copy is older than
 * the definition, since that is the one signal a refetch answers.
 */
export async function buildAuthorizationCatalog(
    ctx: AuthorizationCatalogBuilderContext,
    canReachRealm: AuthorizationRealmReach,
) : Promise<AuthorizationCatalog> {
    // keyed on the realm itself, never on a stand-in: `null` (global) and an
    // empty string are different rows and must not share a verdict
    const reach = new Map<string | null, boolean>();
    const canReach = async (realmId: string | null) : Promise<boolean> => {
        const held = reach.get(realmId);
        if (typeof held !== 'undefined') {
            return held;
        }

        const result = await canReachRealm(realmId);
        reach.set(realmId, result);

        return result;
    };

    // A tree is one policy expression, so it travels whole or not at all: one
    // node out of reach withholds the tree, since a partial one would deny or
    // permit by a rule the caller cannot see.
    const canReachTree = async (tree: BasePolicy) : Promise<boolean> => {
        for (const realmId of collectRealmIds(tree, new Set<string | null | undefined>())) {
            if (typeof realmId === 'undefined' || !await canReach(realmId)) {
                return false;
            }
        }

        return true;
    };

    // Prototype-free: the keys are policy ids, and an id of `__proto__` would
    // set the prototype of a plain object instead of becoming an own entry,
    // so the definition referencing it would name a policy the catalog does
    // not carry. Unreachable while ids are uuid primary keys, and one word.
    const policies : Record<string, AuthorizationPolicy> = Object.create(null);
    const withheld = new Set<string>();

    const project = async (trees: BasePolicy[]) : Promise<string[] | PolicyDrop> => {
        const projected : [string, AuthorizationPolicy][] = [];
        for (const tree of trees) {
            let id : string | undefined;
            try {
                id = readPolicyId(tree);
                if (!await canReachTree(tree)) {
                    withheld.add(id);
                    projected.push([id, { type: AUTHORIZATION_POLICY_WITHHELD_TYPE }]);
                    continue;
                }

                projected.push([
                    id,
                    Object.hasOwn(policies, id) ? policies[id]! : await projectAuthorizationPolicy(tree, ctx.validators),
                ]);
            } catch (e) {
                return {
                    policyId: id,
                    message: e instanceof Error ? e.message : String(e),
                };
            }
        }

        for (const [id, tree] of projected) {
            policies[id] = tree;
        }

        return projected.map(([id]) => id);
    };

    const permissions : [string, AuthorizationDefinition][] = [];
    const definitions = await ctx.catalogRepository.findDefinitions();
    for (const [permission, trees] of definitions) {
        const entry : AuthorizationDefinition = {
            name: permission.name,
            realm_id: permission.realmId ?? null,
            client_id: permission.clientId ?? null,
            decision_strategy: permission.decisionStrategy ?? null,
            policies: [],
        };
        const key = definitionKey(entry);

        if (!await canReach(entry.realm_id)) {
            entry.policies = null;
            permissions.push([key, entry]);
            continue;
        }

        const ids = await project(trees);
        if (!Array.isArray(ids)) {
            ctx.logger?.warn(
                `Carried the definition of permission ${key} in the authorization catalog without its policies` +
                `${ids.policyId ? ` (policy ${ids.policyId})` : ''}: ${ids.message}. ` +
                'Every consumer denies it and drops a grant of it until the policy is fixed.',
            );
        }

        entry.policies = Array.isArray(ids) && ids.every((id) => !withheld.has(id)) ? ids : null;
        permissions.push([key, entry]);
    }

    const grantPolicies = await ctx.catalogRepository.findGrantPolicies();
    for (const tree of grantPolicies) {
        const ids = await project([tree]);
        if (!Array.isArray(ids)) {
            ctx.logger?.warn(
                `Dropped a grant policy${ids.policyId ? ` (${ids.policyId})` : ''} from the authorization catalog: ` +
                `${ids.message}. The introspection drops every grant of it as well.`,
            );
        }
    }

    permissions.sort(([a], [b]) => compareKeys(a, b));

    return {
        policies,
        permissions: permissions.map(([, entry]) => entry),
    };
}
