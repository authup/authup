/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    AuthorizationDocument,
    AuthorizationGrant,
    AuthorizationIdentity,
    AuthorizationPermission,
    AuthorizationPolicy,
    BasePermission,
    BasePolicy,
    IdentityPolicyData,
} from '@authup/access';
import {
    AUTHORIZATION_DOCUMENT_VERSION,
    buildPermissionKey,
    containsBindingCheck,
    normalizeRealmScope,
    projectAuthorizationPolicy,
} from '@authup/access';
import { InternalError } from '@authup/errors';
import type { AuthorizationDocumentBuilderContext } from './types.ts';

type Group = {
    permission: BasePermission,
    grants: AuthorizationGrant[],
};

type PolicyDrop = {
    policyId: string | undefined,
    message: string,
};

function readPolicyId(policy: BasePolicy) : string {
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

export function buildAuthorizationIdentity(identity: IdentityPolicyData) : AuthorizationIdentity {
    if (identity.type !== 'user' && identity.type !== 'client') {
        throw new InternalError(`An authorization document cannot be built for a ${identity.type} identity.`);
    }

    return {
        id: identity.id,
        type: identity.type,
        realm_id: identity.realmId ?? null,
        realm_name: identity.realmName ?? null,
        client_id: identity.clientId ?? null,
    };
}

export async function buildAuthorizationDocument(
    ctx: AuthorizationDocumentBuilderContext,
    identity: IdentityPolicyData,
) : Promise<AuthorizationDocument> {
    const authorizationIdentity = buildAuthorizationIdentity(identity);

    const policies : Record<string, AuthorizationPolicy> = {};
    const collect = async (
        trees: BasePolicy[] | undefined,
        withinGrant: boolean,
    ) : Promise<string[] | PolicyDrop> => {
        const ids : string[] = [];
        for (const tree of trees ?? []) {
            let id : string | undefined;
            try {
                id = readPolicyId(tree);
                const projected = Object.hasOwn(policies, id) ?
                    policies[id]! :
                    await projectAuthorizationPolicy(tree);
                if (withinGrant && containsBindingCheck(projected)) {
                    throw new InternalError('The policy carries a permissionBinding node.');
                }
                policies[id] = projected;
            } catch (e) {
                return {
                    policyId: id,
                    message: e instanceof Error ? e.message : String(e),
                };
            }
            ids.push(id);
        }

        return ids;
    };

    const drop = (subject: string, key: string, failure: PolicyDrop) => {
        ctx.logger?.warn(
            `Dropped ${subject} of permission ${key} from the authorization document` +
            `${failure.policyId ? ` (policy ${failure.policyId})` : ''}: ${failure.message}`,
        );
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

        const grantPolicies = await collect(binding.policies, true);
        if (!Array.isArray(grantPolicies)) {
            drop('a grant', key, grantPolicies);
            continue;
        }

        group.grants.push({
            realm_scope: normalizeRealmScope(binding.realmScope),
            policies: grantPolicies,
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
    for (const [key, group] of groups.entries().toArray().sort(([a], [b]) => compareKeys(a, b))) {
        const definition = definitionsByKey.get(key);
        if (!definition || group.grants.length === 0) {
            continue;
        }

        const definitionPolicies = await collect(definition.policies, false);
        if (!Array.isArray(definitionPolicies)) {
            drop('the definition', key, definitionPolicies);
            continue;
        }

        permissions.push({
            name: group.permission.name,
            realm_id: group.permission.realmId ?? null,
            client_id: group.permission.clientId ?? null,
            decision_strategy: definition.permission.decisionStrategy ?? null,
            policies: definitionPolicies,
            grants: group.grants,
        });
    }

    return {
        version: AUTHORIZATION_DOCUMENT_VERSION,
        identity: authorizationIdentity,
        policies,
        permissions,
    };
}
