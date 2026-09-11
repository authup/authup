/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BasePolicy } from '@authup/access';
import { aggregatePermissionPolicyBindings, buildPermissionKey } from '@authup/access';
import { DecisionStrategy } from '@authup/kit';
import type { OAuth2Authorization, OAuth2AuthorizationPolicy, OAuth2TokenPermission } from '@authup/specs';
import { OAuth2RequestError } from '@authup/specs';
import { toIdentityPolicyData } from '../../identity/permission/identity-policy-data.ts';
import { OAuth2OpenIDClaimsBuilder } from '../openid/claims.ts';
import type {
    OAuth2IntrospectionSubject,
    OAuth2IntrospectionSubjectContext,
    OAuth2IntrospectionSubjectInput,
} from './types.ts';

/**
 * The subject half of an introspection answer: resolve the identity, build its
 * OpenID claims and, only for an active credential, project its permissions.
 *
 * One owner for that projection, so a second consumer (the console session
 * endpoint, plan 088) cannot drift from `POST /token/introspect`. The token
 * half (verification, the `active` derivation, the RFC 7662 reporting rules)
 * stays in the controller, which also owns the response spread order.
 *
 * @throws OAuth2RequestError when the subject no longer resolves.
 */
export async function resolveIntrospectionSubject(
    ctx: OAuth2IntrospectionSubjectContext,
    input: OAuth2IntrospectionSubjectInput,
) : Promise<OAuth2IntrospectionSubject> {
    const identity = await ctx.identityResolver.resolve(input.subKind, input.sub);
    if (!identity) {
        // todo: differentiate between client & user
        throw OAuth2RequestError.identityInvalid();
    }

    const claimsBuilder = new OAuth2OpenIDClaimsBuilder();
    const claims = claimsBuilder.fromIdentity(identity);

    if (!input.active) {
        return {
            identity,
            claims,
        };
    }

    // todo: only receive client specific permissions
    const permissions = await ctx.identityPermissionProvider.getFor({
        id: input.sub,
        type: input.subKind,
        clientId: input.clientId,
        realmId: input.realmId,
    });

    const actor = toIdentityPolicyData(identity)!;
    const authorizationBindings = (input.clientId ?? null) === (actor.clientId ?? null) ?
        permissions : await ctx.identityPermissionProvider.getFor(actor);
    const authorization: OAuth2Authorization = {
        version: 1,
        identity: {
            id: actor.id,
            type: identity.type,
            realm_id: actor.realmId ?? null,
            realm_name: actor.realmName ?? null,
            client_id: actor.clientId ?? null,
        },
        permissions: [],
    };
    for (const binding of aggregatePermissionPolicyBindings(authorizationBindings)) {
        const key = {
            name: binding.permission.name,
            clientId: binding.permission.clientId ?? null,
            realmId: binding.permission.realmId ?? null,
        };
        const definition = await ctx.permissionProvider.findOne(key);
        if (!definition || definition.grants.length === 0) {
            continue;
        }
        const policies = definition.grants.map((grant) => serializePolicy(grant.policy));
        let policy: OAuth2AuthorizationPolicy | null = null;
        if (!policies.includes(null)) {
            policy = policies.length === 1 ? policies[0]! : {
                type: 'composite',
                decisionStrategy: DecisionStrategy.AFFIRMATIVE,
                children: policies.filter((item): item is OAuth2AuthorizationPolicy => item !== null),
            };
        }
        authorization.permissions.push({
            name: key.name,
            client_id: key.clientId,
            realm_id: key.realmId,
            policy,
            grants: binding.grants.map((grant) => ({
                realm_scope: grant.realmScope,
                policy: serializePolicy(grant.policy),
            })),
        });
    }

    return {
        identity,
        claims,
        authorization,
        // todo: permissions property should be removed.
        permissions: Object.values(
            permissions.reduce((acc, binding) => {
                const key = buildPermissionKey(binding.permission);
                if (!acc[key]) {
                    acc[key] = {
                        name: binding.permission.name,
                        client_id: binding.permission.clientId,
                        realm_id: binding.permission.realmId,
                    } as OAuth2TokenPermission;
                }
                return acc;
            }, {} as Record<string, OAuth2TokenPermission>),
        ),
    };
}

function serializePolicy(policy: BasePolicy | undefined): OAuth2AuthorizationPolicy | null {
    if (!policy) {
        return null;
    }
    if (!policy.type) {
        throw new Error('An authorization policy must declare its type.');
    }
    return { ...policy, type: policy.type };
}
