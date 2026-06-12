/*
 * Copyright (c) 2024-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    OAuth2TokenGrantResponse,
    OAuth2TokenIntrospectionResponse,
} from '@authup/specs';
import type {
    RequestTransformer,
    Response,
} from 'hapic';
import { HeaderName, stringifyAuthorizationHeader } from 'hapic';
import { OAuth2BaseAPI } from '../base';
import type {
    IOAuth2TokenAPI,
    OAuth2ClientAuthenticationParameters,
    OAuth2TokenAuthorizationCodeGrantParameters,
    OAuth2TokenClientCredentialsGrantParameters,
    OAuth2TokenGrantParameters,
    OAuth2TokenIntrospectParameters,
    OAuth2TokenPasswordGrantParameters,
    OAuth2TokenRefreshTokenGrantParameters,
    OAuth2TokenRequestOptions,
    OAuth2TokenRevokeParameters,
    OAuth2TokenRobotCredentialsGrantParameters,
} from '../types';

export class OAuth2TokenAPI extends OAuth2BaseAPI implements IOAuth2TokenAPI {
    async createWithRefreshToken(
        parameters: Omit<OAuth2TokenRefreshTokenGrantParameters, 'grant_type'>,
        options?: OAuth2TokenRequestOptions,
    ) : Promise<OAuth2TokenGrantResponse> {
        return this.create({ grant_type: 'refresh_token', ...parameters }, options);
    }

    async createWithClientCredentials(
        parameters: Omit<OAuth2TokenClientCredentialsGrantParameters, 'grant_type'> = {},
        options?: OAuth2TokenRequestOptions,
    ) : Promise<OAuth2TokenGrantResponse> {
        return this.create({ grant_type: 'client_credentials', ...parameters }, options);
    }

    async createWithPassword(
        parameters: Omit<OAuth2TokenPasswordGrantParameters, 'grant_type'>,
        options?: OAuth2TokenRequestOptions,
    ) : Promise<OAuth2TokenGrantResponse> {
        return this.create({ grant_type: 'password', ...parameters }, options);
    }

    async createWithAuthorizationCode(
        parameters: Omit<OAuth2TokenAuthorizationCodeGrantParameters, 'grant_type'>,
        options?: OAuth2TokenRequestOptions,
    ) : Promise<OAuth2TokenGrantResponse> {
        return this.create({ grant_type: 'authorization_code', ...parameters }, options);
    }

    async createWithRobotCredentials(
        parameters: Omit<OAuth2TokenRobotCredentialsGrantParameters, 'grant_type'>,
        options?: OAuth2TokenRequestOptions,
    ) : Promise<OAuth2TokenGrantResponse> {
        return this.create({ grant_type: 'robot_credentials', ...parameters }, options);
    }

    // ------------------------------------------------------------------

    async create(
        parameters: OAuth2TokenGrantParameters,
        options: OAuth2TokenRequestOptions = {},
    ) : Promise<OAuth2TokenGrantResponse> {
        this.extendCreateParameters(parameters);

        const response = await this.client.post(
            this.options.tokenEndpoint || '/token',
            this.buildURLSearchParams(parameters),
            {
                transform: this.buildRequestTransformers(parameters, options),
                headers: { [HeaderName.ACCEPT]: 'application/json' },
            },
        );

        const { data } = response;

        const tokenResponse : OAuth2TokenGrantResponse = {
            access_token: data.access_token,
            expires_in: data.expires_in,
            token_type: data.token_type || 'Bearer',
        };

        if (data.refresh_token) {
            tokenResponse.refresh_token = data.refresh_token;
        }

        if (typeof data.refresh_token_expires_in === 'number') {
            tokenResponse.refresh_token_expires_in = data.refresh_token_expires_in;
        }

        if (typeof data.id_token === 'string') {
            tokenResponse.id_token = data.id_token;
        }

        if (typeof data.mac_key === 'string') {
            tokenResponse.mac_key = data.mac_key;
        }

        if (typeof data.mac_algorithm === 'string') {
            tokenResponse.mac_algorithm = data.mac_algorithm;
        }

        return tokenResponse;
    }

    async revoke(
        parameters: OAuth2TokenRevokeParameters = {},
        options: OAuth2TokenRequestOptions = {},
    ) : Promise<Response> {
        return this.client.post(
            this.options.revocationEndpoint || '/token/revoke',
            this.buildURLSearchParams(parameters),
            {
                transform: this.buildRequestTransformers(parameters, options),
                headers: { [HeaderName.ACCEPT]: 'application/json' },
            },
        );
    }

    async introspect<T extends OAuth2TokenIntrospectionResponse = OAuth2TokenIntrospectionResponse>(
        parameters: OAuth2TokenIntrospectParameters = {},
        options: OAuth2TokenRequestOptions = {},
    ) : Promise<T> {
        const response = await this.client.post(
            this.options.introspectionEndpoint || '/token/introspect',
            this.buildURLSearchParams(parameters),
            {
                transform: this.buildRequestTransformers(parameters, options),
                headers: { [HeaderName.ACCEPT]: 'application/json' },
            },
        );

        return response.data;
    }

    // ------------------------------------------------------------------

    protected buildRequestTransformers(
        parameters: OAuth2ClientAuthenticationParameters,
        options: OAuth2TokenRequestOptions = {},
    ) : RequestTransformer[] {
        if (!options.clientId) {
            if (this.options.clientId) {
                options.clientId = this.options.clientId;
            }

            if (this.options.clientSecret) {
                options.clientSecret = this.options.clientSecret;
            }
        }

        if (!options.realmId && this.options.realmId) {
            options.realmId = this.options.realmId;
        }

        return [
            (data, headers) => {
                if (!options.clientId) {
                    options.clientId = parameters.client_id;
                    options.clientSecret = parameters.client_secret;
                }

                if (!options.realmId) {
                    options.realmId = parameters.realm_id;
                }

                this.transformRequestHeaders(headers, options);

                if (options.clientCredentialsAsHeader && data instanceof URLSearchParams) {
                    data.delete('client_id');
                    data.delete('client_secret');
                }

                return data;
            },
        ];
    }

    /**
     * Token endpoint requests are urlencoded and, by default,
     * unauthenticated — client credentials travel as body parameters
     * unless an explicit header (or clientCredentialsAsHeader) is set.
     */
    protected transformRequestHeaders(
        headers: Headers,
        options: OAuth2TokenRequestOptions = {},
    ) : void {
        headers.set('Content-Type', 'application/x-www-form-urlencoded');

        if (options.authorizationHeaderInherit && headers.has('Authorization')) {
            return;
        }

        headers.delete('Authorization');

        if (options.authorizationHeader) {
            headers.set(
                'Authorization',
                typeof options.authorizationHeader === 'string' ?
                    options.authorizationHeader :
                    stringifyAuthorizationHeader(options.authorizationHeader),
            );

            return;
        }

        if (options.clientCredentialsAsHeader && options.clientId && options.clientSecret) {
            headers.set('Authorization', stringifyAuthorizationHeader({
                type: 'Basic',
                username: options.clientId,
                password: options.clientSecret,
            }));
        }
    }

    protected extendCreateParameters(parameters: OAuth2TokenGrantParameters) : OAuth2TokenGrantParameters {
        if (
            parameters.grant_type !== 'authorization_code' &&
            parameters.grant_type !== 'robot_credentials'
        ) {
            if (!parameters.scope && this.options.scope) {
                parameters.scope = this.options.scope;
            }
        }

        if (parameters.grant_type === 'authorization_code') {
            if (!parameters.redirect_uri && this.options.redirectUri) {
                parameters.redirect_uri = this.options.redirectUri;
            }
        }

        if (!parameters.client_id) {
            if (parameters.client_secret) {
                delete parameters.client_secret;
            }

            if (this.options.clientId) {
                parameters.client_id = this.options.clientId;
            }

            if (this.options.clientSecret) {
                parameters.client_secret = this.options.clientSecret;
            }
        }

        if (!parameters.realm_id && this.options.realmId) {
            parameters.realm_id = this.options.realmId;
        }

        return parameters;
    }

    protected buildURLSearchParams(input: Record<string, any>) : URLSearchParams {
        const urlSearchParams = new URLSearchParams();

        const keys = Object.keys(input);
        for (const key of keys) {
            const value = input[key];
            if (typeof value === 'string' && !!value) {
                urlSearchParams.append(key, value);
            } else if (Array.isArray(value)) {
                const str = value.filter((el) => el).join(' ');
                if (str) {
                    urlSearchParams.append(key, str);
                }
            }
        }

        return urlSearchParams;
    }
}
