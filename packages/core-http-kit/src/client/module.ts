/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2AuthorizationCodeRequest, User } from '@authup/core-kit';
import { Client as BaseClient, HookName, isClientError } from 'hapic';
import type {
    Options,
} from '@hapic/oauth2';
import {
    AuthorizeAPI,
    TokenAPI,
    UserInfoAPI,
} from '@hapic/oauth2';
import type { OAuth2JsonWebKey, OAuth2OpenIDProviderMetadata } from '@authup/kit';
import {
    ClientAPI,
    ClientScopeAPI,
    IdentityProviderAPI,
    IdentityProviderRoleMappingAPI,
    PermissionAPI,
    PolicyAPI,
    RealmAPI,
    RobotAPI,
    RobotPermissionAPI,
    RobotRoleAPI,
    RoleAPI,
    RoleAttributeAPI,
    RolePermissionAPI,
    ScopeAPI,
    UserAPI,
    UserAttributeAPI,
    UserPermissionAPI,
    UserRoleAPI,
} from '../domains';
import { nullifyEmptyObjectProperties } from '../utils';
import type { ClientOptions } from './type';

export class Client extends BaseClient {
    public readonly token : TokenAPI;

    public readonly authorize : AuthorizeAPI;

    public readonly client : ClientAPI;

    public readonly clientScope : ClientScopeAPI;

    public readonly identityProvider : IdentityProviderAPI;

    public readonly identityProviderRoleMapping : IdentityProviderRoleMappingAPI;

    public readonly policy: PolicyAPI;

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

    public readonly userInfo : UserInfoAPI;

    public readonly userAttribute: UserAttributeAPI;

    public readonly userPermission : UserPermissionAPI;

    public readonly userRole : UserRoleAPI;

    constructor(config: ClientOptions = {}) {
        super(config);

        const options : Options = {
            authorizationEndpoint: 'authorize',
            introspectionEndpoint: 'token/introspect',
            tokenEndpoint: 'token',
            userinfoEndpoint: 'users/@me',
        };

        const baseURL = this.getBaseURL();

        if (typeof baseURL === 'string') {
            const keys = Object.keys(options);
            for (let i = 0; i < keys.length; i++) {
                options[keys[i]] = new URL(options[keys[i]], baseURL).href;
            }
        }

        this.authorize = new AuthorizeAPI({ client: this, options });
        this.token = new TokenAPI({ client: this, options });

        this.client = new ClientAPI({ client: this });
        this.clientScope = new ClientScopeAPI({ client: this });

        this.identityProvider = new IdentityProviderAPI({ client: this });
        this.identityProviderRoleMapping = new IdentityProviderRoleMappingAPI({ client: this });

        this.policy = new PolicyAPI({ client: this });
        this.permission = new PermissionAPI({ client: this });

        this.realm = new RealmAPI({ client: this });

        this.robot = new RobotAPI({ client: this });
        this.robotPermission = new RobotPermissionAPI({ client: this });
        this.robotRole = new RobotRoleAPI({ client: this });

        this.role = new RoleAPI({ client: this });
        this.roleAttribute = new RoleAttributeAPI({ client: this });
        this.rolePermission = new RolePermissionAPI({ client: this });

        this.scope = new ScopeAPI({ client: this });

        this.user = new UserAPI({ client: this });
        this.userInfo = new UserInfoAPI({ client: this, options });
        this.userAttribute = new UserAttributeAPI({ client: this });
        this.userPermission = new UserPermissionAPI({ client: this });
        this.userRole = new UserRoleAPI({ client: this });

        this.on(HookName.RESPONSE_ERROR, ((error) => {
            if (
                isClientError(error) &&
                error.response &&
                error.response.data &&
                    typeof error.response.data.message === 'string'
            ) {
                error.message = error.response.data.message;
            }

            throw error;
        }));
    }

    async sendAuthorize(data: OAuth2AuthorizationCodeRequest) : Promise<{ url: string }> {
        const response = await this.post('authorize', nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async getJwks() : Promise<OAuth2JsonWebKey[]> {
        const response = await this.get('jwks');

        return response.data;
    }

    async getJwk(id: string) : Promise<OAuth2JsonWebKey> {
        const response = await this.get(`jwks/${id}`);

        return response.data;
    }

    async getWellKnownOpenIDConfiguration() : Promise<OAuth2OpenIDProviderMetadata> {
        const response = await this.get('/.well-known/openid-configuration');
        return response.data;
    }

    async activate(
        token: string,
    ): Promise<User> {
        const response = await this.post('activate', {
            token,
        });

        return response.data;
    }

    async register(
        data: Partial<Pick<User, 'email' | 'name' | 'password' | 'realm_id'>>,
    ): Promise<User> {
        const response = await this.post('register', nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async passwordForgot(
        data: Partial<Pick<User, 'email' | 'name' | 'realm_id'>>,
    ) : Promise<User> {
        const response = await this.post('password-forgot', nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async passwordReset(
        data: Partial<Pick<User, 'email' | 'name' | 'realm_id'>> &
        { token: string, password: string },
    ) : Promise<User> {
        const response = await this.post('password-reset', nullifyEmptyObjectProperties(data));

        return response.data;
    }
}
