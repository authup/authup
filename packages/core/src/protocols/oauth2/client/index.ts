/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import axios from 'axios';
import {decode} from "jsonwebtoken";

import {
    Oauth2AuthorizationGrantParameters,
    Oauth2PasswordGrantParameters,
    Oauth2ClientProtocolOptions,
    Oauth2GrantParameters,
    Oauth2ClientCredentialsGrantParameters,
    Oauth2RefreshTokenGrantParameters,
    Oauth2AuthorizeQueryParameters
} from "./type";
import {TokenResponseError} from "./error";
import {AccessTokenPayload, Oauth2TokenResponse} from "../type";
import {buildHTTPQuery} from "../../../http";
import {UserinfoResponseError} from "./error";
import {removeDuplicateForwardSlashesFromURL} from "../../../utils";

export * from './error';
export * from './type';

export class Oauth2Client {
    constructor(protected protocolOptions: Oauth2ClientProtocolOptions) {

    }

    // ------------------------------------------------------------------

    async getTokenWithRefreshToken(
        parameters: Pick<Oauth2RefreshTokenGrantParameters, 'refresh_token' | 'scope'>
    ) {
        return await this.getToken(this.buildTokenParameters({
            grant_type: 'refresh_token',
            ...parameters
        }));
    }

    async getTokenWithClientCredentials(
        parameters?: Pick<Oauth2ClientCredentialsGrantParameters, 'scope'>
    ) {
        return await this.getToken(this.buildTokenParameters({
            grant_type: 'client_credentials',
            ...(parameters ? parameters : {})
        }));
    }

    async getTokenWithPasswordGrant(
        parameters: Pick<Oauth2PasswordGrantParameters, 'username' | 'password' | 'scope'>
    ) {
        return await this.getToken(this.buildTokenParameters({
            grant_type: 'password',
            ...parameters
        }));
    }

    async getTokenWithAuthorizeGrant(
        parameters: Pick<Oauth2AuthorizationGrantParameters, 'state' | 'code' | 'redirect_uri'>
    ) : Promise<Oauth2TokenResponse> {
        return await this.getToken(this.buildTokenParameters({
            grant_type: 'authorization_code',
            ...parameters
        }));
    }

    // ------------------------------------------------------------------

    /**
     * @throws TokenResponseError
     * @param parameters
     */
    async getToken(parameters: Oauth2GrantParameters) : Promise<Oauth2TokenResponse> {
        const urlSearchParams = new URLSearchParams();
        for(const key in parameters) {
            urlSearchParams.append(key, (parameters as Record<string, any>)[key]);
        }

        let url : string = this.protocolOptions.token_host;

        if(typeof this.protocolOptions.token_path === 'string') {
            url += this.protocolOptions.token_path;
        } else {
            url += '/oauth/token';
        }

        try {
            const {data} = await axios.post(
                removeDuplicateForwardSlashesFromURL(url),
                urlSearchParams,
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            const tokenResponse: Oauth2TokenResponse = {
                access_token: data.access_token,
                refresh_token: data.refresh_token,
                expires_in: data.expires_in,
                token_type: data.token_type ?? 'Bearer',
            }

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
                tokenResponse.access_token_payload = accessTokenPayload as AccessTokenPayload;
            }

            return tokenResponse;
        } catch (e) {
            /* istanbul ignore next */
            throw new TokenResponseError(e);
        }
    }

    // ------------------------------------------------------------------

    /**
     * @throws UserinfoResponseError
     * @param token
     */
    async getUserInfo(token: string) {
        let url : string = this.protocolOptions.user_info_host ?? this.protocolOptions.token_host;

        if(typeof this.protocolOptions.user_info_path === 'string') {
            url += this.protocolOptions.user_info_path;
        } else {
            url += '/userinfo';
        }

        try {
            const {data} = await axios.get(
                removeDuplicateForwardSlashesFromURL(url),
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            return data;
        } catch (e) {
            /* istanbul ignore next */
            throw new UserinfoResponseError(e);
        }
    }

    // ------------------------------------------------------------------

    buildTokenParameters(parameters: Oauth2GrantParameters) : Oauth2GrantParameters {
        parameters.client_id = this.protocolOptions.client_id;

        if(
            parameters.grant_type !== 'authorization_code'
        ) {
            if(
                typeof parameters.scope === 'undefined' &&
                this.protocolOptions.scope
            ) {
                parameters.scope = this.protocolOptions.scope;
            }

            if(Array.isArray(parameters.scope)) {
                parameters.scope = parameters.scope.join(" ");
            }
        }

        if(
            parameters.grant_type === 'authorization_code'
        ) {
            if(typeof parameters.redirect_uri === 'undefined') {
                parameters.redirect_uri = this.protocolOptions.redirect_uri;
            }
        }

        if(typeof this.protocolOptions.client_id === 'string') {
            parameters.client_id = this.protocolOptions.client_id;
        }

        if(typeof this.protocolOptions.client_secret === 'string') {
            parameters.client_secret = this.protocolOptions.client_secret;
        }

        return parameters;
    }

    buildAuthorizeURL(parameters?: Partial<Pick<Oauth2AuthorizeQueryParameters, 'redirect_uri' | 'scope'>>) {
        parameters = parameters ?? {};

        const queryParameters : Oauth2AuthorizeQueryParameters = {
            response_type: 'code',
            client_id: this.protocolOptions.client_id,
            redirect_uri: this.protocolOptions.redirect_uri
        }

        if(typeof parameters.redirect_uri === 'string') {
            queryParameters.redirect_uri = parameters.redirect_uri;
        }

        if(typeof parameters.scope === 'undefined') {
            if(this.protocolOptions.scope) {
                queryParameters.scope = this.protocolOptions.scope;
            }
        } else {
            queryParameters.scope = parameters.scope;
        }

        if(Array.isArray(queryParameters.scope)) {
            queryParameters.scope = queryParameters.scope.join(" ");
        }

        const host : string = this.protocolOptions.authorize_host ?? this.protocolOptions.token_host;
        const path : string = this.protocolOptions.authorize_path ?? '/oauth/authorize';

        return removeDuplicateForwardSlashesFromURL(host + path) + buildHTTPQuery(queryParameters);
    }
}
