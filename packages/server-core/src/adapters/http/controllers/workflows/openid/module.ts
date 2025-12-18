/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { OAuth2AuthorizationResponseType, OpenIDProviderMetadata } from '@authup/specs';
import {
    DController, DGet,
} from '@routup/decorators';

export type OpenIDControllerOptions = {
    baseURL: string
};

@DController('')
export class OpenIDController {
    protected options: OpenIDControllerOptions;

    constructor(options: OpenIDControllerOptions) {
        this.options = options;
    }

    @DGet('/.well-known/openid-configuration', [])
    async getOpenIdConfiguration(): Promise<OpenIDProviderMetadata> {
        return {
            issuer: this.options.baseURL,

            authorization_endpoint: new URL('authorize', this.options.baseURL).href,

            jwks_uri: new URL('jwks', this.options.baseURL).href,

            response_types_supported: [
                OAuth2AuthorizationResponseType.CODE,
                OAuth2AuthorizationResponseType.TOKEN,
                OAuth2AuthorizationResponseType.NONE,
            ],

            subject_types_supported: [
                'public',
            ],

            id_token_signing_alg_values_supported: [
                'HS256', 'HS384', 'HS512', 'RS256', 'RS384', 'RS512', 'none',
            ],

            token_endpoint: new URL('token', this.options.baseURL).href,

            introspection_endpoint: new URL('token/introspect', this.options.baseURL).href,

            revocation_endpoint: new URL('token', this.options.baseURL).href,

            // -----------------------------------------------------------

            service_documentation: 'https://authup.org/',

            userinfo_endpoint: new URL('users/@me', this.options.baseURL).href,
        };
    }
}
