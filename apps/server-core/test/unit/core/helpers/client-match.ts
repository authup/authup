/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    AuthorizationPolicy,
    BasePolicy,
    IPermissionEvaluator,
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

export type ClientMatchActorGrant = {
    name: string,
    realmScope: `${RealmScope}`,
    /**
     * The junction policy; policy-free when absent.
     */
    policy?: AuthorizationPolicy,
};

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
    /**
     * Grants held beside those `names` describes.
     */
    grants?: ClientMatchActorGrant[],
};

/**
 * A client actor evaluated by the real engine: every name is granted at
 * `own` reach and bound to a `clientMatch` policy. Its `grants` resolver
 * answers the same grants as bindings, and `narrowGrants` evaluates with
 * only the bindings it is handed.
 */
export async function createClientMatchActor(options: ClientMatchActorOptions): Promise<ActorContext> {
    const policy = options.policy ?? { type: BuiltInPolicyType.CLIENT_MATCH };
    const grants: ClientMatchActorGrant[] = [
        ...options.names.map((name) => ({
            name,
            realmScope: RealmScope.OWN,
            policy,
        })),
        ...(options.unrestricted ?
            options.names.map((name) => ({ name, realmScope: RealmScope.OWN })) :
            []),
        ...(options.grants ?? []),
    ];

    const bindings: PermissionPolicyBinding[] = grants.map((grant) => ({
        permission: {
            name: grant.name,
            realmId: null,
            clientId: null,
        },
        realmScope: grant.realmScope,
        ...(grant.policy ? { policies: [grant.policy as BasePolicy] } : {}),
    }));

    const names = [...new Set(grants.map((grant) => grant.name))];

    const build = (held: ClientMatchActorGrant[]) => createAuthorizationEvaluator({
        catalog: {
            policies: {
                binding: { type: BuiltInPolicyType.PERMISSION_BINDING },
                ...Object.fromEntries(grants
                    .map((grant, index) => [`p${index}`, grant.policy])
                    .filter(([, value]) => !!value)),
            },
            permissions: names.map((name) => ({
                name,
                realmId: null,
                clientId: null,
                decisionStrategy: null,
                policies: ['binding'],
            })),
        },
        grants: held.map((grant) => ({
            name: grant.name,
            realm_id: null,
            client_id: null,
            realm_scope: grant.realmScope,
            ...(grant.policy ? { policies: [`p${grants.indexOf(grant)}`] } : {}),
        })),
        identity: {
            id: options.clientId,
            type: IdentityType.CLIENT,
            realmId: options.realmId,
            realmName: 'tenant',
            clientId: options.clientId,
        },
    });

    const evaluator = await build(grants);
    const none = await build([]);

    // a binding is named by its content, as the request evaluator matches it
    const narrowed = new Map<string, IPermissionEvaluator>();

    for (const [index, binding] of bindings.entries()) {
        narrowed.set(JSON.stringify(binding), await build([grants[index]!]));
    }

    return {
        permissionEvaluator: evaluator,
        grants: async () => bindings,
        narrowGrants: (named) => {
            if (named.length !== 1) {
                throw new Error('The actor narrows to exactly one binding.');
            }

            return narrowed.get(JSON.stringify(named[0])) ?? none;
        },
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
