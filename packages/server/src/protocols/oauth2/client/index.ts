import axios from 'axios';
import {decode} from "jsonwebtoken";

import {
    Oauth2ClientAuthorizationGrantParameters,
    Oauth2ClientPasswordGrantParameters,
    Oauth2ClientProtocolOptions,
    Oauth2ClientTokenResponse
} from "./type";

export class Oauth2ClientProtocol {
    constructor(protected protocolOptions: Oauth2ClientProtocolOptions) {

    }

    async getTokenWithPasswordGrant(parameters: Oauth2ClientPasswordGrantParameters) {
        const params : Record<string, any> = {
            grant_type: 'password',
            client_id: this.protocolOptions.clientId,
            ...parameters
        }

        if(typeof this.protocolOptions.clientSecret === 'string') {
            params.client_secret = this.protocolOptions.clientSecret;
        }

        return await this.makeTokenRequest(params);
    }

    async getTokenWithAuthorizeGrant(parameters: Oauth2ClientAuthorizationGrantParameters) : Promise<Oauth2ClientTokenResponse> {
        const params : Record<string, any> = {
            grant_type: 'authorize_code',
            client_id: this.protocolOptions.clientId,
            redirect_uri: this.protocolOptions.authorizeRedirectURL,
            ...parameters
        };

        if(typeof this.protocolOptions.scope !== 'undefined') {
            params.scope = Array.isArray(this.protocolOptions.scope) ? this.protocolOptions.scope.join(" ") : this.protocolOptions.scope;
        }

        if(typeof this.protocolOptions.clientSecret === 'string') {
            params.client_secret = this.protocolOptions.clientSecret;
        }

        return await this.makeTokenRequest(params);
    }

    async makeTokenRequest(params: Record<string, any>) : Promise<Oauth2ClientTokenResponse> {
        const urlSearchParams = new URLSearchParams();
        for(const key in params) {
            urlSearchParams.append(key, params[key]);
        }

        let url : string = this.protocolOptions.tokenHost;

        if(typeof this.protocolOptions.tokenPath === 'string') {
            url += this.protocolOptions.tokenPath;
        } else {
            url += '/oauth/token';
        }

        const {data} = await axios.post(
            url,
            urlSearchParams,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        const tokenResponse: Oauth2ClientTokenResponse = {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresIn: data.expires_in
        }

        const decodedPayload = decode(tokenResponse.accessToken);

        if(typeof decodedPayload === 'object') {
            tokenResponse.accessTokenPayload = decodedPayload;
        }

        return tokenResponse;
    }
}
