/*
 * Copyright (c) 2026.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { Client, Robot, User } from '@authup/core-kit';
import {
    PermissionName, REALM_MASTER_NAME, ROLE_ADMIN_NAME, ScopeName, buildUserFakeEmail,
} from '@authup/core-kit';
import type { IDIContainer } from '../../../../../core/index.ts';
import {
    ClientCredentialsService,
    RobotCredentialsService,
    UserCredentialsService,
} from '../../../../../core/index.ts';
import type { Config } from '../../../config/index.ts';
import { ConfigInjectionKey } from '../../../config/index.ts';
import type { RealmProvisioningEntity } from '../../../../../core/provisioning/entities/realm/index.ts';
import type { RootProvisioningEntity } from '../../../../../core/provisioning/entities/root/index.ts';
import type { ProvisioningEntityStrategy } from '../../../../../core/provisioning/strategy/index.ts';
import { ProvisioningEntityStrategyType } from '../../../../../core/provisioning/strategy/index.ts';
import type { IProvisioningSource } from '../../../../../core/provisioning/types.ts';

export class DefaultProvisioningSource implements IProvisioningSource {
    async load(container: IDIContainer): Promise<RootProvisioningEntity> {
        const config = container.resolve<Config>(ConfigInjectionKey);

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

        return {
            permissions: Object.values(PermissionName)
                .map((name) => ({
                    strategy: {
                        type: ProvisioningEntityStrategyType.MERGE,
                        attributes: ['built_in'],
                    },
                    attributes: {
                        name,
                        built_in: true,
                    },
                })),
            scopes: Object.values(ScopeName)
                .map((name) => ({
                    strategy: {
                        type: ProvisioningEntityStrategyType.MERGE,
                        attributes: ['built_in'],
                    },
                    attributes: {
                        name,
                        built_in: true,
                    },
                })),
            roles: [
                {
                    strategy: {
                        type: ProvisioningEntityStrategyType.MERGE,
                        attributes: ['built_in'],
                    },
                    attributes: {
                        name: ROLE_ADMIN_NAME,
                        built_in: true,
                    },
                    relations: {
                        globalPermissions: ['*'],
                    },
                },
            ],
            realms: [
                masterRealm,
            ],
        };
    }
}
