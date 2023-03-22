/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ConfigInput } from 'hapic';
import { Client as BaseClient } from 'hapic';

import {
    ClientAPI,
    ClientScopeAPI,
    IdentityProviderAPI,
    IdentityProviderRoleAPI,
    PermissionAPI,
    RealmAPI,
    RobotAPI,
    RobotPermissionAPI,
    RobotRoleAPI, RoleAPI,
    RoleAttributeAPI,
    RolePermissionAPI, ScopeAPI,
    UserAPI,
    UserAttributeAPI,
    UserPermissionAPI,
    UserRoleAPI,
} from '../../domains';

export class HTTPClient extends BaseClient {
    public readonly client : ClientAPI;

    public readonly clientScope : ClientScopeAPI;

    public readonly identityProvider : IdentityProviderAPI;

    public readonly identityProviderRole : IdentityProviderRoleAPI;

    public readonly permission : PermissionAPI;

    public readonly realm : RealmAPI;

    public readonly robot : RobotAPI;

    public readonly robotPermission : RobotPermissionAPI;

    public readonly robotRole : RobotRoleAPI;

    public readonly role : RoleAPI;

    public readonly roleAttribute : RoleAttributeAPI;

    public readonly rolePermission : RolePermissionAPI;

    public readonly scope: ScopeAPI;

    public readonly user : UserAPI;

    public readonly userAttribute: UserAttributeAPI;

    public readonly userPermission : UserPermissionAPI;

    public readonly userRole : UserRoleAPI;

    constructor(config: ConfigInput) {
        super(config);

        this.client = new ClientAPI(this.driver);
        this.clientScope = new ClientScopeAPI(this.driver);

        this.identityProvider = new IdentityProviderAPI(this.driver);
        this.identityProviderRole = new IdentityProviderRoleAPI(this.driver);

        this.permission = new PermissionAPI(this.driver);

        this.realm = new RealmAPI(this.driver);

        this.robot = new RobotAPI(this.driver);
        this.robotPermission = new RobotPermissionAPI(this.driver);
        this.robotRole = new RobotRoleAPI(this.driver);

        this.role = new RoleAPI(this.driver);
        this.roleAttribute = new RoleAttributeAPI(this.driver);
        this.rolePermission = new RolePermissionAPI(this.driver);

        this.scope = new ScopeAPI(this.driver);

        this.user = new UserAPI(this.driver);
        this.userAttribute = new UserAttributeAPI(this.driver);
        this.userPermission = new UserPermissionAPI(this.driver);
        this.userRole = new UserRoleAPI(this.driver);
    }
}
