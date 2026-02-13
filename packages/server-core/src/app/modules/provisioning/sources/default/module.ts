/*
 * Copyright (c) 2026.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import {
    PermissionName, REALM_MASTER_NAME, ROLE_ADMIN_NAME, ScopeName, buildUserFakeEmail,
} from '@authup/core-kit';
import { ClientCredentialsService, RobotCredentialsService, UserCredentialsService } from '../../../../../core';
import type { Config } from '../../../config';
import type { IProvisioningSource, ProvisioningData, RealmProvisioningContainer } from '../../types.ts';
import type { ConfigProvisioningSourceContext } from './types.ts';

export class DefaultProvisioningSource implements IProvisioningSource {
    protected config : Config;

    constructor(ctx: ConfigProvisioningSourceContext) {
        this.config = ctx.config;
    }

    async load(): Promise<ProvisioningData> {
        const masterRealm : RealmProvisioningContainer = {
            data: {
                name: REALM_MASTER_NAME,
                built_in: true,
            },
            meta: {

            },
        };

        const userCredentialsService = new UserCredentialsService();

        masterRealm.meta = masterRealm.meta || {};
        masterRealm.meta.users = [
            {
                data: {
                    name: this.config.userAdminName,
                    password: await userCredentialsService.protect(this.config.userAdminPassword),
                    email: buildUserFakeEmail(this.config.userAdminName),
                    active: this.config.userAdminEnabled,
                },
                meta: {
                    globalRoles: [ROLE_ADMIN_NAME],
                },
            },
        ];

        const clientCredentialsService = new ClientCredentialsService();

        masterRealm.meta = masterRealm.meta || {};
        masterRealm.meta.clients = [
            {
                data: {
                    name: this.config.clientAdminName,
                    secret: await clientCredentialsService.protect(this.config.clientAdminSecret, { secret_hashed: false }),
                    secret_hashed: false,
                    active: this.config.clientAdminEnabled,
                },
                meta: {
                    globalRoles: [ROLE_ADMIN_NAME],
                },
            },
        ];

        const robotCredentialsService = new RobotCredentialsService();

        masterRealm.meta = masterRealm.meta || {};
        masterRealm.meta.robots = [
            {
                data: {
                    name: this.config.robotAdminName,
                    secret: await robotCredentialsService.protect(this.config.robotAdminSecret),
                    active: this.config.robotAdminEnabled,
                },
                meta: {
                    globalRoles: [ROLE_ADMIN_NAME],
                },
            },
        ];

        return {
            permissions: Object.values(PermissionName)
                .map((name) => ({
                    data: {
                        name,
                    },
                })),
            scopes: Object.values(ScopeName)
                .map((name) => ({
                    data: {
                        name,
                        built_in: true,
                    },
                })),
            roles: [
                {
                    data: {
                        name: ROLE_ADMIN_NAME,
                    },
                    meta: {
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
