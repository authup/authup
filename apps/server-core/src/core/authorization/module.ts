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
    AUTHORIZATION_CATALOG_VERSION,
    buildPermissionKey,
    projectAuthorizationPolicy,
} from '@authup/access';
import { InternalError } from '@authup/errors';
import type { AuthorizationCatalogBuilderContext } from './types.ts';

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

export async function buildAuthorizationCatalog(
    ctx: AuthorizationCatalogBuilderContext,
) : Promise<AuthorizationCatalog> {
    // Prototype-free: the keys are policy ids, and an id of `__proto__` would
    // set the prototype of a plain object instead of becoming an own entry,
    // so the definition referencing it would name a policy the catalog does
    // not carry. Unreachable while ids are uuid primary keys, and one word.
    const policies : Record<string, AuthorizationPolicy> = Object.create(null);
    const project = async (trees: BasePolicy[]) : Promise<string[] | PolicyDrop> => {
        const projected : [string, AuthorizationPolicy][] = [];
        for (const tree of trees) {
            let id : string | undefined;
            try {
                id = readPolicyId(tree);
                projected.push([
                    id,
                    Object.hasOwn(policies, id) ? policies[id]! : await projectAuthorizationPolicy(tree),
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
    const definitions = await ctx.permissionDefinitionProvider.findAll();
    for (const definition of definitions) {
        const entry : AuthorizationDefinition = {
            name: definition.permission.name,
            realm_id: definition.permission.realmId ?? null,
            client_id: definition.permission.clientId ?? null,
            decision_strategy: definition.permission.decisionStrategy ?? null,
            policies: [],
        };
        const key = definitionKey(entry);

        const ids = await project(definition.policies);
        if (!Array.isArray(ids)) {
            ctx.logger?.warn(
                `Carried the definition of permission ${key} in the authorization catalog without its policies` +
                `${ids.policyId ? ` (policy ${ids.policyId})` : ''}: ${ids.message}. ` +
                'Every consumer denies it and drops a grant of it until the policy is fixed.',
            );
        }

        entry.policies = Array.isArray(ids) ? ids : null;
        permissions.push([key, entry]);
    }

    const grantPolicies = await ctx.permissionDefinitionProvider.findGrantPolicies();
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
        version: AUTHORIZATION_CATALOG_VERSION,
        policies,
        permissions: permissions.map(([, entry]) => entry),
    };
}
