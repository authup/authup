/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AuthorizationPolicy } from '@authup/access';
import { BuiltInPolicyType, RealmScope, createAuthorizationEvaluator } from '@authup/access';
import { IdentityType } from '@authup/core-kit';
import type { ActorContext } from '@authup/server-kit';

export type ClientMatchActorOptions = {
    clientId: string,
    realmId: string,
    names: string[],
    /**
     * Also hold every name without a junction policy.
     */
    unrestricted?: boolean,
    /**
     * The junction policy, `clientMatch` unless given.
     */
    policy?: AuthorizationPolicy,
};

/**
 * A client actor evaluated by the real engine: every name is granted at
 * `own` reach and bound to a `clientMatch` policy.
 */
export async function createClientMatchActor(options: ClientMatchActorOptions): Promise<ActorContext> {
    const evaluator = await createAuthorizationEvaluator({
        catalog: {
            policies: {
                binding: { type: BuiltInPolicyType.PERMISSION_BINDING },
                owned: options.policy ?? { type: BuiltInPolicyType.CLIENT_MATCH },
            },
            permissions: options.names.map((name) => ({
                name,
                realmId: null,
                clientId: null,
                decisionStrategy: null,
                policies: ['binding'],
            })),
        },
        grants: [
            ...options.names.map((name) => ({
                name,
                realm_id: null,
                client_id: null,
                realm_scope: RealmScope.OWN,
                policies: ['owned'],
            })),
            ...(options.unrestricted ?
                options.names.map((name) => ({
                    name,
                    realm_id: null,
                    client_id: null,
                    realm_scope: RealmScope.OWN,
                })) :
                []),
        ],
        identity: {
            id: options.clientId,
            type: IdentityType.CLIENT,
            realmId: options.realmId,
            realmName: 'tenant',
            clientId: options.clientId,
        },
    });

    return { permissionEvaluator: evaluator };
}
