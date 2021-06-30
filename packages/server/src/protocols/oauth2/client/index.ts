import axios from 'axios';
import {decode} from "jsonwebtoken";

import {
    Oauth2ClientAuthorizationGrantParameters,
    Oauth2ClientPasswordGrantParameters,
    Oauth2ClientProtocolOptions,
    Oauth2TokenResponse
} from "./type";
import {TokenResponseError} from "./error/token-response";

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

        return await this.getToken(params);
    }

    async getTokenWithAuthorizeGrant(parameters: Oauth2ClientAuthorizationGrantParameters) : Promise<Oauth2TokenResponse> {
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

        return await this.getToken(params);
    }

    /**
     *
     *
     * @throws TokenResponseError
     * @param params
     */
    async getToken(params: Record<string, any>) : Promise<Oauth2TokenResponse> {
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
            }

            if (typeof data.mac_key === 'string') {
                tokenResponse.macKey = data.mac_key;
            }

            if (typeof data.mac_algorithm === 'string') {
                tokenResponse.macAlgorithm = data.mac_algorithm;
            }

            const decodedPayload = decode(tokenResponse.accessToken);

            if (typeof decodedPayload === 'object') {
                tokenResponse.accessTokenPayload = decodedPayload;
            }

            return tokenResponse;
        } catch (e) {
            let code : string | undefined;
            let message : string | undefined = 'An unknown error occurred.';

            if(typeof e.response.data?.code === 'string') {
                code = e.response.data.code;
            }

            if(typeof e.response.data?.error_description === 'string') {
                message = e.response.data.error_description;
            }

            throw new TokenResponseError(message, code);
        }
    }
}
