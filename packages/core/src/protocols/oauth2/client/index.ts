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
import {parseResponseError} from "./utils";
import {UserinfoResponseError} from "./error/userinfo-response";

export * from './error';
export * from './type';

export class Oauth2ClientProtocol {
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
        parameters: Pick<Oauth2ClientCredentialsGrantParameters, 'scope'>
    ) {
        return await this.getToken(this.buildTokenParameters({
            grant_type: 'client_credentials',
            ...parameters
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

        let url : string = this.protocolOptions.tokenHost;

        if(typeof this.protocolOptions.tokenPath === 'string') {
            url += this.protocolOptions.tokenPath;
        } else {
            url += '/oauth/token';
        }

        try {
            const {data} = await axios.post(
                url,
                urlSearchParams,
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            const tokenResponse: Oauth2TokenResponse = {
                accessToken: data.access_token,
                refreshToken: data.refresh_token,
                expiresIn: data.expires_in,
                tokenType: data.token_type ?? 'Bearer',
            }

            if (typeof data.id_token === 'string') {
                tokenResponse.idToken = data.id_token;

                const idTokenPayload = decode(tokenResponse.idToken);

                if (idTokenPayload && typeof idTokenPayload === 'object') {
                    tokenResponse.idTokenPayload = idTokenPayload as Record<string, any>;
                }
            }

            if (typeof data.mac_key === 'string') {
                tokenResponse.macKey = data.mac_key;
            }

            if (typeof data.mac_algorithm === 'string') {
                tokenResponse.macAlgorithm = data.mac_algorithm;
            }

            const accessTokenPayload = decode(tokenResponse.accessToken);

            if (accessTokenPayload && typeof accessTokenPayload === 'object') {
                tokenResponse.accessTokenPayload = accessTokenPayload as AccessTokenPayload;
            }

            return tokenResponse;
        } catch (e) {
            const {code, statusCode, message} = parseResponseError(e);

            throw new TokenResponseError(message, code, statusCode);
        }
    }

    // ------------------------------------------------------------------

    /**
     * @throws UserinfoResponseError
     * @param token
     */
    async getUserInfo(token: string) {
        let url : string = this.protocolOptions.userInfoHost ?? this.protocolOptions.tokenHost;

        if(typeof this.protocolOptions.userInfoPath === 'string') {
            url += this.protocolOptions.userInfoPath;
        } else {
            url += '/userinfo';
        }

        try {
            const {data} = await axios.get(
                url,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            return data;
        } catch (e) {
            const {code, statusCode, message} = parseResponseError(e);

            throw new UserinfoResponseError(message, code, statusCode);
        }
    }

    // ------------------------------------------------------------------

    buildTokenParameters(parameters: Oauth2GrantParameters) : Oauth2GrantParameters {
        parameters.client_id = this.protocolOptions.clientId;

        if(
            parameters.grant_type !== 'authorization_code'
        ) {
            if(
                typeof parameters.scope === 'undefined' &&
                typeof this.protocolOptions.scope !== 'undefined'
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
                parameters.redirect_uri = this.protocolOptions.authorizeRedirectURL;
            }
        }

        if(typeof this.protocolOptions.clientId === 'string') {
            parameters.client_id = this.protocolOptions.clientId;
        }

        if(typeof this.protocolOptions.clientSecret === 'string') {
            parameters.client_secret = this.protocolOptions.clientSecret;
        }

        return parameters;
    }

    buildAuthorizeURL(parameters: Partial<Pick<Oauth2AuthorizeQueryParameters, 'redirect_uri' | 'scope'>>) {
        const queryParameters : Oauth2AuthorizeQueryParameters = {
            response_type: 'code',
            client_id: this.protocolOptions.clientId,
            redirect_uri: this.protocolOptions.authorizeRedirectURL
        }

        if(typeof parameters.redirect_uri === 'string') {
            queryParameters.redirect_uri = parameters.redirect_uri;
        }

        if(typeof parameters.scope === 'undefined') {
            if(typeof this.protocolOptions.scope !== 'undefined') {
                queryParameters.scope = this.protocolOptions.scope;
            }
        } else {
            queryParameters.scope = parameters.scope;
        }

        if(Array.isArray(queryParameters.scope)) {
            queryParameters.scope = queryParameters.scope.join(" ");
        }

        const host : string = this.protocolOptions.authorizeHost ?? this.protocolOptions.tokenHost;
        const path : string = this.protocolOptions.authorizePath ?? '/oauth/authorize';

        return host + path + buildHTTPQuery(queryParameters);
    }
}
