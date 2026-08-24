/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { buildPermissionKey } from '@authup/access';
import type { OAuth2TokenPermission } from '@authup/specs';
import { OAuth2RequestError } from '@authup/specs';
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

    return {
        identity,
        claims,
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
