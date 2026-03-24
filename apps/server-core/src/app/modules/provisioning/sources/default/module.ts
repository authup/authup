/*
 * Copyright (c) 2026.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, DecisionStrategy, SystemPolicyName } from '@authup/access';
import type {
    Client, Permission, Robot, Role, Scope, User,
} from '@authup/core-kit';
import {
    PermissionName, REALM_MASTER_NAME, ROLE_ADMIN_NAME, ROLE_REALM_ADMIN_NAME, ScopeName, buildUserFakeEmail,
} from '@authup/core-kit';
import type { IDIContainer } from '../../../../../core/index.ts';
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
                    built_in: true,
                    realm_id: null,
                },
                extraAttributes: {
                    decision_strategy: DecisionStrategy.UNANIMOUS,
                },
                children: [
                    {
                        attributes: {
                            name: SystemPolicyName.IDENTITY,
                            type: BuiltInPolicyType.IDENTITY,
                            built_in: true,
                            realm_id: null,
                        },
                    },
                    {
                        attributes: {
                            name: SystemPolicyName.PERMISSION_BINDING,
                            type: BuiltInPolicyType.PERMISSION_BINDING,
                            built_in: true,
                            realm_id: null,
                        },
                    },
                    {
                        attributes: {
                            name: SystemPolicyName.REALM_MATCH,
                            type: BuiltInPolicyType.REALM_MATCH,
                            built_in: true,
                            realm_id: null,
                        },
                        extraAttributes: {
                            attribute_name: ['realm_id'],
                            attribute_name_strict: false,
                            identity_master_match_all: false,
                            attribute_null_match_all: true,
                        },
                    },
                ],
            },
            {
                attributes: {
                    name: SystemPolicyName.REALM_BOUND,
                    type: BuiltInPolicyType.REALM_MATCH,
                    built_in: true,
                    realm_id: null,
                },
                extraAttributes: {
                    attribute_name: ['realm_id'],
                    attribute_name_strict: false,
                    attribute_null_match_all: false,
                    identity_master_match_all: false,
                },
            },
            {
                attributes: {
                    name: SystemPolicyName.REALM_OR_GLOBAL,
                    type: BuiltInPolicyType.REALM_MATCH,
                    built_in: true,
                    realm_id: null,
                },
                extraAttributes: {
                    attribute_name: ['realm_id'],
                    attribute_name_strict: false,
                    attribute_null_match_all: true,
                    identity_master_match_all: false,
                },
            },
        ];
    }

    buildPermissions(): PermissionProvisioningEntity[] {
        return Object.values(PermissionName)
            .map((name) => ({
                strategy: {
                    type: ProvisioningEntityStrategyType.MERGE,
                    attributes: ['built_in'] as (keyof Permission)[],
                },
                attributes: {
                    name,
                    built_in: true,
                },
            }));
    }

    buildScopes(): ScopeProvisioningEntity[] {
        return Object.values(ScopeName)
            .map((name) => ({
                strategy: {
                    type: ProvisioningEntityStrategyType.MERGE,
                    attributes: ['built_in'] as (keyof Scope)[],
                },
                attributes: {
                    name,
                    built_in: true,
                },
            }));
    }

    buildRoles(): RoleProvisioningEntity[] {
        return [
            {
                strategy: {
                    type: ProvisioningEntityStrategyType.MERGE,
                    attributes: ['built_in'] as (keyof Role)[],
                },
                attributes: {
                    name: ROLE_ADMIN_NAME,
                    built_in: true,
                },
                relations: {
                    globalPermissions: ['*'],
                },
            },
            {
                strategy: {
                    type: ProvisioningEntityStrategyType.MERGE,
                    attributes: ['built_in'] as (keyof Role)[],
                },
                attributes: {
                    name: ROLE_REALM_ADMIN_NAME,
                    built_in: true,
                },
                relations: {
                    globalPermissions: ['*'],
                    globalPermissionsExclude: [
                        PermissionName.REALM_CREATE,
                        PermissionName.REALM_UPDATE,
                        PermissionName.REALM_DELETE,
                    ],
                    globalPermissionsPolicyName: SystemPolicyName.REALM_OR_GLOBAL,
                    globalPermissionsPolicyOverrides: {
                        [SystemPolicyName.REALM_BOUND]: [
                            PermissionName.ROLE_CREATE,
                            PermissionName.ROLE_UPDATE,
                            PermissionName.ROLE_DELETE,
                            PermissionName.PERMISSION_CREATE,
                            PermissionName.PERMISSION_UPDATE,
                            PermissionName.PERMISSION_DELETE,
                            PermissionName.SCOPE_CREATE,
                            PermissionName.SCOPE_UPDATE,
                            PermissionName.SCOPE_DELETE,
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
                attributes: ['built_in'],
            },
            attributes: {
                name: REALM_MASTER_NAME,
                built_in: true,
            },
            relations: {

            },
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
                relations: {
                    globalRoles: [ROLE_ADMIN_NAME],
                },
            },
        ];

        const clientCredentialsService = new ClientCredentialsService();

        let clientStrategy : ProvisioningEntityStrategy<Client> | undefined;
        if (config.clientSystemSecretReset) {
            clientStrategy = {
                type: ProvisioningEntityStrategyType.MERGE,
                attributes: ['built_in', 'is_confidential', 'secret', 'secret_hashed', 'secret_encrypted'],
            };
        } else {
            clientStrategy = {
                type: ProvisioningEntityStrategyType.MERGE,
                attributes: ['built_in', 'is_confidential'],
            };
        }

        masterRealm.relations = masterRealm.relations || {};
        masterRealm.relations.clients = [
            {
                strategy: clientStrategy,
                attributes: {
                    built_in: true,
                    is_confidential: true,
                    name: 'system',
                    secret: await clientCredentialsService.protect(config.clientSystemSecret, { secret_hashed: false }),
                    secret_hashed: false,
                    active: config.clientSystemEnabled,
                },
                relations: {
                    globalRoles: [ROLE_ADMIN_NAME],
                },
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
                relations: {
                    globalRoles: [ROLE_ADMIN_NAME],
                },
            },
        ];

        return [masterRealm];
    }

    async load(container: IDIContainer): Promise<RootProvisioningEntity> {
        const config = container.resolve<Config>(ConfigInjectionKey);

        return {
            policies: this.buildPolicies(),
            permissions: this.buildPermissions(),
            scopes: this.buildScopes(),
            roles: this.buildRoles(),
            realms: await this.buildRealms(config),
        };
    }
}
