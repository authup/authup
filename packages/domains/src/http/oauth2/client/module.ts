/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { decode } from 'jsonwebtoken';
import {
    HTTPOAuth2ClientOptions,
    Oauth2AuthorizationGrantParameters,
    Oauth2AuthorizeQueryParameters,
    Oauth2ClientCredentialsGrantParameters,
    Oauth2GrantParameters,
    Oauth2PasswordGrantParameters,
    Oauth2RefreshTokenGrantParameters,
} from './type';
import { OAuth2AccessTokenPayload, Oauth2TokenResponse } from '../../../entities';
import { buildHTTPQuery } from '../../utils';
import { removeDuplicateForwardSlashesFromURL } from '../../../utils';

export class HTTPOAuth2Client {
    public httpClient : AxiosInstance;

    constructor(
        protected options: HTTPOAuth2ClientOptions,
        protected httpConfig?: AxiosRequestConfig,
    ) {
        this.httpClient = process.env.NODE_ENV === 'test' ?
            axios :
            axios.create({
                ...(httpConfig || {}),
            });
    }

    // ------------------------------------------------------------------

    async getTokenWithRefreshToken(
        parameters: Pick<Oauth2RefreshTokenGrantParameters, 'refresh_token' | 'scope'>,
    ) {
        return this.getToken(this.buildTokenParameters({
            grant_type: 'refresh_token',
            ...parameters,
        }));
    }

    async getTokenWithClientCredentials(
        parameters?: Pick<Oauth2ClientCredentialsGrantParameters, 'scope'>,
    ) {
        return this.getToken(this.buildTokenParameters({
            grant_type: 'client_credentials',
            ...(parameters || {}),
        }));
    }

    async getTokenWithPasswordGrant(
        parameters: Pick<Oauth2PasswordGrantParameters, 'username' | 'password' | 'scope'>,
    ) {
        return this.getToken(this.buildTokenParameters({
            grant_type: 'password',
            ...parameters,
        }));
    }

    async getTokenWithAuthorizeGrant(
        parameters: Pick<Oauth2AuthorizationGrantParameters, 'state' | 'code' | 'redirect_uri'>,
    ): Promise<Oauth2TokenResponse> {
        return this.getToken(this.buildTokenParameters({
            grant_type: 'authorization_code',
            ...parameters,
        }));
    }

    // ------------------------------------------------------------------

    /**
     * @throws Error
     * @param parameters
     */
    async getToken(parameters: Oauth2GrantParameters): Promise<Oauth2TokenResponse> {
        const urlSearchParams = new URLSearchParams();
        const parameterKeys = Object.keys(parameters);

        for (let i = 0; i < parameterKeys.length; i++) {
            urlSearchParams.append(parameterKeys[i], (parameters as Record<string, any>)[parameterKeys[i]]);
        }

        const url: string = removeDuplicateForwardSlashesFromURL(this.options.token_host + (this.options.token_path || '/oauth/token'));

        const { data } = await this.httpClient.post(
            url,
            urlSearchParams,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            },
        );

        const tokenResponse: Oauth2TokenResponse = {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_in: data.expires_in,
            token_type: data.token_type ?? 'Bearer',
        };

        if (typeof data.id_token === 'string') {
            tokenResponse.id_token = data.id_token;

            const idTokenPayload = decode(tokenResponse.id_token);

            if (idTokenPayload && typeof idTokenPayload === 'object') {
                tokenResponse.id_token_payload = idTokenPayload as Record<string, any>;
            }
        }

        if (typeof data.mac_key === 'string') {
            tokenResponse.mac_key = data.mac_key;
        }

        if (typeof data.mac_algorithm === 'string') {
            tokenResponse.mac_algorithm = data.mac_algorithm;
        }

        const accessTokenPayload = decode(tokenResponse.access_token);

        if (accessTokenPayload && typeof accessTokenPayload === 'object') {
            tokenResponse.access_token_payload = accessTokenPayload as OAuth2AccessTokenPayload;
        }

        return tokenResponse;
    }

    // ------------------------------------------------------------------

    /**
     * @throws Error
     * @param token
     */
    async getUserInfo(token: string) {
        let url: string = this.options.user_info_host ?? this.options.token_host;

        if (typeof this.options.user_info_path === 'string') {
            url += this.options.user_info_path;
        } else {
            url += '/userinfo';
        }

        const { data } = await this.httpClient.get(
            removeDuplicateForwardSlashesFromURL(url),
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        );

        return data;
    }

    // ------------------------------------------------------------------

    buildTokenParameters(parameters: Oauth2GrantParameters): Oauth2GrantParameters {
        parameters.client_id = this.options.client_id;

        if (
            parameters.grant_type !== 'authorization_code'
        ) {
            if (
                typeof parameters.scope === 'undefined' &&
                this.options.scope
            ) {
                parameters.scope = this.options.scope;
            }

            if (Array.isArray(parameters.scope)) {
                parameters.scope = parameters.scope.join(' ');
            }
        }

        if (
            parameters.grant_type === 'authorization_code'
        ) {
            if (typeof parameters.redirect_uri === 'undefined') {
                parameters.redirect_uri = this.options.redirect_uri;
            }
        }

        if (typeof this.options.client_id === 'string') {
            parameters.client_id = this.options.client_id;
        }

        if (typeof this.options.client_secret === 'string') {
            parameters.client_secret = this.options.client_secret;
        }

        return parameters;
    }

    buildAuthorizeURL(parameters?: Partial<Pick<Oauth2AuthorizeQueryParameters, 'redirect_uri' | 'scope'>>) {
        parameters = parameters ?? {};

        const queryParameters: Oauth2AuthorizeQueryParameters = {
            response_type: 'code',
            client_id: this.options.client_id,
            redirect_uri: this.options.redirect_uri,
        };

        if (typeof parameters.redirect_uri === 'string') {
            queryParameters.redirect_uri = parameters.redirect_uri;
        }

        if (typeof parameters.scope === 'undefined') {
            if (this.options.scope) {
                queryParameters.scope = this.options.scope;
            }
        } else {
            queryParameters.scope = parameters.scope;
        }

        if (Array.isArray(queryParameters.scope)) {
            queryParameters.scope = queryParameters.scope.join(' ');
        }

        const host: string = this.options.authorize_host ?? this.options.token_host;
        const path: string = this.options.authorize_path ?? '/oauth/authorize';

        return removeDuplicateForwardSlashesFromURL(host + path) + buildHTTPQuery(queryParameters);
    }
}
