/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    AuthorizationPolicy,
    BasePolicy,
    PermissionEvaluationContext,
    PermissionPolicyBinding,
} from '@authup/access';
import { BuiltInPolicyType, RealmScope, createAuthorizationEvaluator } from '@authup/access';
import { IdentityType } from '@authup/core-kit';
import type { ActorContext } from '@authup/server-kit';
import type { IClientRepository } from '../../../../src/core/entities/client/types.ts';
import type { IRoleRepository } from '../../../../src/core/entities/role/types.ts';
import type { IUserRepository } from '../../../../src/core/entities/user/types.ts';
import { IdentityPermissionProvider } from '../../../../src/core/identity/permission/module.ts';
import type { IIdentityRoleProvider } from '../../../../src/core/identity/role/types.ts';

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
 * `own` reach and bound to a `clientMatch` policy. Its `grants` resolver
 * answers the same grants as bindings.
 */
export async function createClientMatchActor(options: ClientMatchActorOptions): Promise<ActorContext> {
    const policy = options.policy ?? { type: BuiltInPolicyType.CLIENT_MATCH };
    const bindings: PermissionPolicyBinding[] = options.names.flatMap((name) => [
        {
            permission: {
                name, 
                realmId: null, 
                clientId: null, 
            },
            realmScope: RealmScope.OWN,
            policies: [policy as BasePolicy],
        },
        ...(options.unrestricted ?
            [{
                permission: {
                    name, 
                    realmId: null, 
                    clientId: null, 
                },
                realmScope: RealmScope.OWN, 
            }] :
            []),
    ]);

    const evaluator = await createAuthorizationEvaluator({
        catalog: {
            policies: {
                binding: { type: BuiltInPolicyType.PERMISSION_BINDING },
                owned: policy,
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

    return {
        permissionEvaluator: evaluator,
        grants: async () => bindings,
    };
}

/**
 * The real permission provider, for a spec that decides delegation on the
 * actor's own grants only (no subject is looked up).
 */
export function createIdentityPermissionProvider(): IdentityPermissionProvider {
    return new IdentityPermissionProvider({
        clientRepository: {} as IClientRepository,
        userRepository: {} as IUserRepository,
        roleRepository: {} as IRoleRepository,
        roleProvider: {} as IIdentityRoleProvider,
    });
}

/**
 * Hold every bound permission outside `names`, so a junction write tests
 * the junction's own gate rather than the hold rule on its definition.
 */
export function withHeldPermissions(actor: ActorContext, names: string[]): ActorContext {
    const evaluator = actor.permissionEvaluator;

    return {
        ...actor,
        permissionEvaluator: new Proxy(evaluator, {
            get(target, property) {
                if (property === 'preEvaluate') {
                    return async (ctx: PermissionEvaluationContext) => {
                        const requested = Array.isArray(ctx.name) ? ctx.name : [ctx.name];
                        const gated = requested.some((name) => names.includes(name));

                        if (gated) {
                            await target.preEvaluate(ctx);
                        }
                    };
                }

                const value = Reflect.get(target, property, target);

                return typeof value === 'function' ? value.bind(target) : value;
            },
        }),
    };
}
