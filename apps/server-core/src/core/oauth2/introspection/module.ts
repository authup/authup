/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { buildPermissionKey, normalizeRealmScope, projectAuthorizationPolicy } from '@authup/access';
import type { OAuth2TokenPermission } from '@authup/specs';
import { OAuth2RequestError } from '@authup/specs';
import { readPolicyId } from '../../authorization/module.ts';
import { OAuth2OpenIDClaimsBuilder } from '../openid/claims.ts';
import type {
    OAuth2IntrospectionSubject,
    OAuth2IntrospectionSubjectContext,
    OAuth2IntrospectionSubjectInput,
} from './types.ts';

/**
 * The subject half of an introspection answer: resolve the identity, build its
 * OpenID claims and, only for an active credential, project its grants.
 *
 * One owner for that projection, so a second consumer (the console session
 * endpoint, plan 088) cannot drift from `POST /token/introspect`. The token
 * half (verification, the `active` derivation, the RFC 7662 reporting rules)
 * stays in the controller, which also owns the response spread order.
 *
 * `permissions` is the identity's GRANT list, one entry per junction row in
 * the order the provider returns them: the namespace, the grant's own realm
 * reach and the ids of its junction policy trees, which pair with the catalog
 * `GET /authorization` serves. A grant whose junction tree that catalog cannot
 * carry (no id, or a tree its projection refuses) is dropped with a warning:
 * the server itself fails such a grant closed, and naming it would read as a
 * stale catalog to every consumer.
 *
 * The projection is the grants the token carries (`getForToken`), exactly what
 * a request made with it evaluates, so both endpoints report what the server's
 * own evaluator resolves: a user's grants owned by another client are absent
 * (#3597).
 *
 * @throws OAuth2RequestError when the subject no longer resolves.
 */
export async function resolveIntrospectionSubject(
    ctx: OAuth2IntrospectionSubjectContext,
    input: OAuth2IntrospectionSubjectInput,
) : Promise<OAuth2IntrospectionSubject> {
    const identity = await ctx.identityResolver.resolve(input.token.sub_kind, input.token.sub);
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

    const bindings = await ctx.identityPermissionProvider.getForToken(input.token);

    const permissions : OAuth2TokenPermission[] = [];
    for (const binding of bindings) {
        const policies : string[] = [];
        try {
            for (const policy of binding.policies ?? []) {
                policies.push(readPolicyId(policy));
                await projectAuthorizationPolicy(policy, ctx.validators);
            }
        } catch (e) {
            ctx.logger?.warn(
                `Dropped a grant of permission ${buildPermissionKey(binding.permission)} from the introspection: ` +
                `${e instanceof Error ? e.message : String(e)}`,
            );
            continue;
        }

        permissions.push({
            name: binding.permission.name,
            realm_id: binding.permission.realmId ?? null,
            client_id: binding.permission.clientId ?? null,
            realm_scope: normalizeRealmScope(binding.realmScope),
            policies,
        });
    }

    return {
        identity,
        claims,
        permissions,
    };
}
