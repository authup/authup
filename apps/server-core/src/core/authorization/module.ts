/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    AuthorizationDocument,
    AuthorizationGrant,
    AuthorizationPermission,
    AuthorizationPolicy,
    BasePermission,
    BasePolicy,
    IdentityPolicyData,
} from '@authup/access';
import {
    AUTHORIZATION_DOCUMENT_VERSION,
    buildPermissionKey,
    normalizeRealmScope,
    projectAuthorizationPolicy,
} from '@authup/access';
import { InternalError } from '@authup/errors';
import type { AuthorizationDocumentBuilderContext } from './types.ts';

type Group = {
    permission: BasePermission,
    grants: AuthorizationGrant[],
};

function readPolicyId(policy: BasePolicy) : string {
    const { id } = policy as { id?: unknown };
    if (typeof id !== 'string' || id.length === 0) {
        throw new InternalError('An authorization policy tree must carry its id.');
    }

    return id;
}

export async function buildAuthorizationDocument(
    ctx: AuthorizationDocumentBuilderContext,
    identity: IdentityPolicyData,
) : Promise<AuthorizationDocument> {
    if (identity.type !== 'user' && identity.type !== 'client') {
        throw new InternalError(`An authorization document cannot be built for a ${identity.type} identity.`);
    }

    const policies : Record<string, AuthorizationPolicy> = {};
    const collect = async (trees: BasePolicy[] | undefined) : Promise<string[]> => {
        const ids : string[] = [];
        for (const tree of trees ?? []) {
            const id = readPolicyId(tree);
            if (!policies[id]) {
                policies[id] = await projectAuthorizationPolicy(tree);
            }
            ids.push(id);
        }

        return ids;
    };

    const groups = new Map<string, Group>();
    const bindings = await ctx.identityPermissionProvider.getFor(identity);
    for (const binding of bindings) {
        const permission : BasePermission = {
            name: binding.permission.name,
            realmId: binding.permission.realmId ?? null,
            clientId: binding.permission.clientId ?? null,
        };
        const key = buildPermissionKey(permission);
        let group = groups.get(key);
        if (!group) {
            group = { permission, grants: [] };
            groups.set(key, group);
        }

        group.grants.push({
            realm_scope: normalizeRealmScope(binding.realmScope),
            policies: await collect(binding.policies),
        });
    }

    const definitions = await ctx.permissionDefinitionProvider.findDefinitions(
        groups.values().toArray().map((group) => group.permission),
    );
    const definitionsByKey = new Map(definitions.map((definition) => [
        buildPermissionKey(definition.permission),
        definition,
    ] as const));

    const permissions : AuthorizationPermission[] = [];
    for (const [key, group] of groups.entries().toArray().sort(([a], [b]) => a.localeCompare(b))) {
        const definition = definitionsByKey.get(key);
        if (!definition) {
            continue;
        }

        permissions.push({
            name: group.permission.name,
            realm_id: group.permission.realmId ?? null,
            client_id: group.permission.clientId ?? null,
            decision_strategy: definition.permission.decisionStrategy ?? null,
            policies: await collect(definition.policies),
            grants: group.grants,
        });
    }

    return {
        version: AUTHORIZATION_DOCUMENT_VERSION,
        identity: {
            id: identity.id,
            type: identity.type,
            realm_id: identity.realmId ?? null,
            realm_name: identity.realmName ?? null,
            client_id: identity.clientId ?? null,
        },
        policies,
        permissions,
    };
}
