/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Client as BaseClient, Config } from 'hapic';
import {
    IdentityProviderAPI,
    IdentityProviderRoleAPI,
    PermissionAPI,
    RealmAPI,
    RobotAPI,
    RobotPermissionAPI,
    RobotRoleAPI, RoleAPI,
    RoleAttributeAPI,
    RolePermissionAPI,
    UserAPI,
    UserAttributeAPI,
    UserPermissionAPI,
    UserRoleAPI,
} from '../../domains';

export class HTTPClient extends BaseClient {
    public readonly oauth2Provider : IdentityProviderAPI;

    public readonly oauth2ProviderRole : IdentityProviderRoleAPI;

    public readonly permission : PermissionAPI;

    public readonly realm : RealmAPI;

    public readonly robot : RobotAPI;

    public readonly robotPermission : RobotPermissionAPI;

    public readonly robotRole : RobotRoleAPI;

    public readonly role : RoleAPI;

    public readonly roleAttribute : RoleAttributeAPI;

    public readonly rolePermission : RolePermissionAPI;

    public readonly user : UserAPI;

    public readonly userAttribute: UserAttributeAPI;

    public readonly userPermission : UserPermissionAPI;

    public readonly userRole : UserRoleAPI;

    constructor(config: Config) {
        super(config);

        this.oauth2Provider = new IdentityProviderAPI(this.driver);
        this.oauth2ProviderRole = new IdentityProviderRoleAPI(this.driver);

        this.permission = new PermissionAPI(this.driver);

        this.realm = new RealmAPI(this.driver);

        this.robot = new RobotAPI(this.driver);
        this.robotPermission = new RobotPermissionAPI(this.driver);
        this.robotRole = new RobotRoleAPI(this.driver);

        this.role = new RoleAPI(this.driver);
        this.roleAttribute = new RoleAttributeAPI(this.driver);
        this.rolePermission = new RolePermissionAPI(this.driver);

        this.user = new UserAPI(this.driver);
        this.userAttribute = new UserAttributeAPI(this.driver);
        this.userPermission = new UserPermissionAPI(this.driver);
        this.userRole = new UserRoleAPI(this.driver);
    }
}
