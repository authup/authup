/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Client, ClientConfig } from '@trapi/client';
import {
    Oauth2ProviderAPI,
    Oauth2ProviderRoleAPI,
    PermissionAPI,
    RealmAPI,
    RobotAPI,
    RobotPermissionAPI, RobotRoleAPI, RoleAPI, RolePermissionAPI, TokenAPI, UserAPI, UserPermissionAPI, UserRoleAPI,
} from '../../../entities';

export class APIClient extends Client {
    public readonly oauth2Provider : Oauth2ProviderAPI;

    public readonly oauth2ProviderRole : Oauth2ProviderRoleAPI;

    public readonly permission : PermissionAPI;

    public readonly realm : RealmAPI;

    public readonly robot : RobotAPI;

    public readonly robotPermission : RobotPermissionAPI;

    public readonly robotRole : RobotRoleAPI;

    public readonly role : RoleAPI;

    public readonly rolePermission : RolePermissionAPI;

    public readonly token : TokenAPI;

    public readonly user : UserAPI;

    public readonly userPermission : UserPermissionAPI;

    public readonly userRole : UserRoleAPI;

    constructor(config: ClientConfig) {
        super(config);

        this.oauth2Provider = new Oauth2ProviderAPI(this.driver);
        this.oauth2ProviderRole = new Oauth2ProviderRoleAPI(this.driver);
        this.permission = new PermissionAPI(this.driver);
        this.realm = new RealmAPI(this.driver);
        this.robot = new RobotAPI(this.driver);
        this.robotPermission = new RobotPermissionAPI(this.driver);
        this.robotRole = new RobotRoleAPI(this.driver);
        this.role = new RoleAPI(this.driver);
        this.rolePermission = new RolePermissionAPI(this.driver);
        this.token = new TokenAPI(this.driver);
        this.user = new UserAPI(this.driver);
        this.userPermission = new UserPermissionAPI(this.driver);
        this.userRole = new UserRoleAPI(this.driver);
    }
}
