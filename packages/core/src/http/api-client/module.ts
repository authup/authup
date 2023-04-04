/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ConfigInput } from 'hapic';
import { Client as BaseClient, isClientError } from 'hapic';
import type { ClientOptions } from '@hapic/oauth2';
import {
    AuthorizeAPI,
    TokenAPI,
    UserinfoAPI,
} from '@hapic/oauth2';

import type { OAuth2JsonWebKey } from '../../domains';
import {
    ClientAPI,
    ClientScopeAPI,
    IdentityProviderAPI,
    IdentityProviderRoleAPI,
    PermissionAPI,
    RealmAPI,
    RobotAPI,
    RobotPermissionAPI,
    RobotRoleAPI,
    RoleAPI, RoleAttributeAPI,
    RolePermissionAPI,
    ScopeAPI,
    UserAPI,
    UserAttributeAPI,
    UserPermissionAPI,
    UserRoleAPI,
} from '../../domains';

export class APIClient extends BaseClient {
    public readonly token : TokenAPI;

    public readonly authorize : AuthorizeAPI;

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

    public readonly userInfo : UserinfoAPI;

    public readonly userAttribute: UserAttributeAPI;

    public readonly userPermission : UserPermissionAPI;

    public readonly userRole : UserRoleAPI;

    constructor(config?: ConfigInput) {
        super(config);

        const options : ClientOptions = {
            authorization_endpoint: 'authorize',
            introspection_endpoint: 'token/introspect',
            token_endpoint: 'token',
            userinfo_endpoint: 'users/@me',
        };

        if (typeof this.config.baseURL === 'string') {
            const keys = Object.keys(options);
            for (let i = 0; i < keys.length; i++) {
                options[keys[i]] = new URL(options[keys[i]], this.config.baseURL).href;
            }
        }

        this.authorize = new AuthorizeAPI(this.driver, options);
        this.token = new TokenAPI(this.driver, options);

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
        this.userInfo = new UserinfoAPI(this.driver, options);
        this.userAttribute = new UserAttributeAPI(this.driver);
        this.userPermission = new UserPermissionAPI(this.driver);
        this.userRole = new UserRoleAPI(this.driver);

        this.mountResponseInterceptor(
            (r) => r,
            ((error) => {
                if (
                    isClientError(error) &&
                    error.response &&
                    error.response.data &&
                    typeof error.response.data.message === 'string'
                ) {
                    error.message = error.response.data.message;
                }

                throw error;
            }),
        );
    }

    async getJwks() : Promise<OAuth2JsonWebKey[]> {
        const response = await this.driver.get('jwks');

        return response.data;
    }

    async getJwk(id: string) : Promise<OAuth2JsonWebKey> {
        const response = await this.driver.get(`jwks/${id}`);

        return response.data;
    }
}
