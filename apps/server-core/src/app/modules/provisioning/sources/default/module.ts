/*
 * Copyright (c) 2026.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, RealmScope, SystemPolicyName } from '@authup/access';
import { DecisionStrategy } from '@authup/kit';
import type {
    Client, 
    Permission, 
    Robot, 
    Role, 
    Scope, 
    User,
} from '@authup/core-kit';
import {
    ClientAuthMethod,
    ClientTokenBindingMethod,
    PermissionName, 
    REALM_MASTER_NAME, 
    ROLE_ADMIN_NAME, 
    ROLE_REALM_ADMIN_NAME, 
    ScopeName, 
    buildUserFakeEmail,
} from '@authup/core-kit';
import type { IContainer } from 'eldin';
import {
    ClientCredentialsService,
    RobotCredentialsService,
    UserCredentialsService,
} from '../../../../../core/index.ts';
import type { Config } from '../../../config/index.ts';
import { ConfigInjectionKey } from '../../../config/index.ts';
import type { PermissionProvisioningEntity } from '../../../../../core/provisioning/entities/permission/index.ts';
import type { PolicyProvisioningEntity } from '../../../../../core/provisioning/entities/policy/index.ts';
import type { RealmProvisioningEntity } from '../../../../../core/provisioning/entities/realm/index.ts';
import type { RoleProvisioningEntity } from '../../../../../core/provisioning/entities/role/index.ts';
import type { RootProvisioningEntity } from '../../../../../core/provisioning/entities/root/index.ts';
import type { ScopeProvisioningEntity } from '../../../../../core/provisioning/entities/scope/index.ts';
import type { ProvisioningEntityStrategy } from '../../../../../core/provisioning/strategy/index.ts';
import { ProvisioningEntityStrategyType } from '../../../../../core/provisioning/strategy/index.ts';
import type { IProvisioningSource } from '../../../../../core/provisioning/types.ts';

export class DefaultProvisioningSource implements IProvisioningSource {
    buildPolicies(): PolicyProvisioningEntity[] {
        return [
            {
                attributes: {
                    name: SystemPolicyName.DEFAULT,
                    type: BuiltInPolicyType.COMPOSITE,
                    builtIn: true,
                    realmId: null,
                },
                extraAttributes: { decisionStrategy: DecisionStrategy.UNANIMOUS },
                children: [
                    {
                        attributes: {
                            name: SystemPolicyName.IDENTITY,
                            type: BuiltInPolicyType.IDENTITY,
                            builtIn: true,
                            realmId: null,
                        },
                    },
                    {
                        attributes: {
                            name: SystemPolicyName.PERMISSION_BINDING,
                            type: BuiltInPolicyType.PERMISSION_BINDING,
                            builtIn: true,
                            realmId: null,
                        },
                    },
                ],
            },
            // Self-manage policies use ATTRIBUTE_NAMES + invert: true (denylist).
            // Each `names` entry is what self-edit must REJECT; everything else
            // is permitted. New columns added to the entity are self-editable
            // by default — extend the denylist when adding admin-only state.
            {
                attributes: {
                    name: SystemPolicyName.CLIENT_NAMES_SELF_MANAGE,
                    type: BuiltInPolicyType.ATTRIBUTE_NAMES,
                    invert: true,
                    builtIn: true,
                    realmId: null,
                },
                extraAttributes: {
                    names: [
                        // FK + lifecycle
                        'active',
                        'realmId',
                        // Security-critical: a self-edit must not change the
                        // client's authentication/binding method (changing the
                        // auth method may clear its secret) or downgrade the
                        // secret-storage format
                        // (which would persist the secret in plaintext).
                        'authMethod',
                        'tokenBindingMethod',
                        'secretHashed',
                        'secretEncrypted',
                        'accessPolicyId',
                    ],
                },
            },
            {
                attributes: {
                    name: SystemPolicyName.ROBOT_NAMES_SELF_MANAGE,
                    type: BuiltInPolicyType.ATTRIBUTE_NAMES,
                    invert: true,
                    builtIn: true,
                    realmId: null,
                },
                extraAttributes: {
                    names: [
                        'active',
                        'realmId',
                        'userId',
                    ],
                },
            },
            {
                attributes: {
                    name: SystemPolicyName.USER_NAMES_SELF_MANAGE,
                    type: BuiltInPolicyType.ATTRIBUTE_NAMES,
                    invert: true,
                    builtIn: true,
                    realmId: null,
                },
                extraAttributes: {
                    names: [
                        'active',
                        'nameLocked',
                        'status',
                        'statusMessage',
                        'realmId',
                    ],
                },
            },
        ];
    }

    buildPermissions(): PermissionProvisioningEntity[] {
        const policiesByPermission: Partial<Record<string, string[]>> = {
            [PermissionName.CLIENT_SELF_MANAGE]: [SystemPolicyName.DEFAULT, SystemPolicyName.CLIENT_NAMES_SELF_MANAGE],
            [PermissionName.ROBOT_SELF_MANAGE]: [SystemPolicyName.DEFAULT, SystemPolicyName.ROBOT_NAMES_SELF_MANAGE],
            [PermissionName.USER_SELF_MANAGE]: [SystemPolicyName.DEFAULT, SystemPolicyName.USER_NAMES_SELF_MANAGE],
        };

        return Object.values(PermissionName)
            .map((name) => {
                const entity: PermissionProvisioningEntity = {
                    strategy: {
                        type: ProvisioningEntityStrategyType.MERGE,
                        attributes: ['builtIn'] as (keyof Permission)[],
                    },
                    attributes: {
                        name,
                        builtIn: true,
                    },
                };

                const policies = policiesByPermission[name];
                if (policies) {
                    entity.relations = { policies };
                }

                return entity;
            });
    }

    buildScopes(): ScopeProvisioningEntity[] {
        return Object.values(ScopeName)
            .map((name) => ({
                strategy: {
                    type: ProvisioningEntityStrategyType.MERGE,
                    attributes: ['builtIn'] as (keyof Scope)[],
                },
                attributes: {
                    name,
                    builtIn: true,
                },
            }));
    }

    buildRoles(): RoleProvisioningEntity[] {
        return [
            {
                strategy: {
                    type: ProvisioningEntityStrategyType.MERGE,
                    attributes: ['builtIn'] as (keyof Role)[],
                },
                attributes: {
                    name: ROLE_ADMIN_NAME,
                    builtIn: true,
                },
                relations: {
                    globalPermissions: ['*'],
                    // Global admin: unrestricted realm reach (any realm + null/global).
                    globalPermissionsRealmScope: RealmScope.ANY,
                },
            },
            {
                strategy: {
                    type: ProvisioningEntityStrategyType.MERGE,
                    attributes: ['builtIn'] as (keyof Role)[],
                },
                attributes: {
                    name: ROLE_REALM_ADMIN_NAME,
                    builtIn: true,
                },
                relations: {
                    globalPermissions: ['*'],
                    globalPermissionsExclude: [
                        PermissionName.REALM_CREATE,
                        PermissionName.REALM_UPDATE,
                        PermissionName.REALM_DELETE,
                    ],
                    // realm_admin: own realm + null/global by default (so it can
                    // read/assign global building blocks), but strictly own-realm for
                    // direct entity CUD (cannot create/modify global entities).
                    globalPermissionsRealmScope: RealmScope.OWN_OR_NULL,
                    globalPermissionsRealmScopeOverrides: {
                        [RealmScope.OWN]: [
                            PermissionName.CLIENT_CREATE,
                            PermissionName.CLIENT_UPDATE,
                            PermissionName.CLIENT_DELETE,
                            PermissionName.CONSENT_DELETE,
                            PermissionName.IDENTITY_PROVIDER_CREATE,
                            PermissionName.IDENTITY_PROVIDER_UPDATE,
                            PermissionName.IDENTITY_PROVIDER_DELETE,
                            PermissionName.KEY_CREATE,
                            PermissionName.KEY_UPDATE,
                            PermissionName.KEY_DELETE,
                            PermissionName.PERMISSION_CREATE,
                            PermissionName.PERMISSION_UPDATE,
                            PermissionName.PERMISSION_DELETE,
                            PermissionName.ROBOT_CREATE,
                            PermissionName.ROBOT_UPDATE,
                            PermissionName.ROBOT_DELETE,
                            PermissionName.ROLE_CREATE,
                            PermissionName.ROLE_UPDATE,
                            PermissionName.ROLE_DELETE,
                            PermissionName.SCOPE_CREATE,
                            PermissionName.SCOPE_UPDATE,
                            PermissionName.SCOPE_DELETE,
                            PermissionName.SESSION_DELETE,
                            PermissionName.USER_CREATE,
                            PermissionName.USER_UPDATE,
                            PermissionName.USER_DELETE,
                            PermissionName.USER_AUTHENTICATOR_CREATE,
                            PermissionName.USER_AUTHENTICATOR_UPDATE,
                            PermissionName.USER_AUTHENTICATOR_DELETE,
                        ],
                    },
                },
            },
        ];
    }

    async buildRealms(config: Config): Promise<RealmProvisioningEntity[]> {
        const masterRealm : RealmProvisioningEntity = {
            strategy: {
                type: ProvisioningEntityStrategyType.MERGE,
                attributes: ['builtIn'],
            },
            attributes: {
                name: REALM_MASTER_NAME,
                builtIn: true,
            },
            relations: {},
        };

        const userCredentialsService = new UserCredentialsService();

        let userStrategy : ProvisioningEntityStrategy<User> | undefined;
        if (config.userAdminPasswordReset) {
            userStrategy = {
                type: ProvisioningEntityStrategyType.MERGE,
                attributes: ['password'],
            };
        }

        masterRealm.relations = masterRealm.relations || {};
        masterRealm.relations.users = [
            {
                strategy: userStrategy,
                attributes: {
                    name: 'admin',
                    password: await userCredentialsService.protect(config.userAdminPassword),
                    email: buildUserFakeEmail('admin'),
                    active: config.userAdminEnabled,
                },
                relations: { globalRoles: [ROLE_ADMIN_NAME] },
            },
        ];

        const clientCredentialsService = new ClientCredentialsService();

        let clientStrategy : ProvisioningEntityStrategy<Client> | undefined;
        if (config.clientSystemSecretReset) {
            clientStrategy = {
                type: ProvisioningEntityStrategyType.MERGE,
                attributes: ['builtIn', 'authMethod', 'tokenBindingMethod', 'secret', 'secretHashed', 'secretEncrypted'],
            };
        } else {
            clientStrategy = {
                type: ProvisioningEntityStrategyType.MERGE,
                attributes: ['builtIn', 'authMethod', 'tokenBindingMethod'],
            };
        }

        masterRealm.relations = masterRealm.relations || {};
        masterRealm.relations.clients = [
            {
                strategy: clientStrategy,
                attributes: {
                    builtIn: true,
                    authMethod: ClientAuthMethod.SECRET,
                    tokenBindingMethod: ClientTokenBindingMethod.NONE,
                    name: 'system',
                    secret: await clientCredentialsService.protect(config.clientSystemSecret, { secretHashed: false }),
                    secretHashed: false,
                    active: config.clientSystemEnabled,
                },
                relations: { globalRoles: [ROLE_ADMIN_NAME] },
            },
        ];

        const robotCredentialsService = new RobotCredentialsService();

        let robotStrategy : ProvisioningEntityStrategy<Robot> | undefined;
        if (config.robotAdminSecretReset) {
            robotStrategy = {
                type: ProvisioningEntityStrategyType.MERGE,
                attributes: ['secret'],
            };
        }

        masterRealm.relations = masterRealm.relations || {};
        masterRealm.relations.robots = [
            {
                strategy: robotStrategy,
                attributes: {
                    name: 'system',
                    secret: await robotCredentialsService.protect(config.robotAdminSecret),
                    active: config.robotAdminEnabled,
                },
                relations: { globalRoles: [ROLE_ADMIN_NAME] },
            },
        ];

        return [masterRealm];
    }

    async load(container: IContainer): Promise<RootProvisioningEntity> {
        const config = container.resolve(ConfigInjectionKey);

        return {
            policies: this.buildPolicies(),
            permissions: this.buildPermissions(),
            scopes: this.buildScopes(),
            roles: this.buildRoles(),
            realms: await this.buildRealms(config),
        };
    }
}
