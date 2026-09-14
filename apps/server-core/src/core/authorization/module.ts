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
    const policies : Record<string, AuthorizationPolicy> = {};
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

    const permissions : AuthorizationDefinition[] = [];
    const definitions = await ctx.permissionDefinitionProvider.findAll();
    for (const definition of definitions) {
        const entry : AuthorizationDefinition = {
            name: definition.permission.name,
            realm_id: definition.permission.realmId ?? null,
            client_id: definition.permission.clientId ?? null,
            decision_strategy: definition.permission.decisionStrategy ?? null,
            policies: [],
        };

        const ids = await project(definition.policies);
        if (!Array.isArray(ids)) {
            ctx.logger?.warn(
                `Dropped the definition of permission ${definitionKey(entry)} from the authorization catalog` +
                `${ids.policyId ? ` (policy ${ids.policyId})` : ''}: ${ids.message}`,
            );
            continue;
        }

        entry.policies = ids;
        permissions.push(entry);
    }

    permissions.sort((a, b) => compareKeys(definitionKey(a), definitionKey(b)));

    return {
        version: AUTHORIZATION_CATALOG_VERSION,
        policies,
        permissions,
    };
}
