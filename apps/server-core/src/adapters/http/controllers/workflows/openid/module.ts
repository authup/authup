/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OpenIDProviderMetadata } from '@authup/specs';
import { OAuth2AuthorizationResponseType } from '@authup/specs';
import {
    DController,
    DGet,
} from '@routup/decorators';
import { resolveURL } from '../../../../../utils/index.ts';

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
        const { baseURL } = this.options;
        return {
            issuer: baseURL,

            authorization_endpoint: resolveURL(baseURL, 'authorize'),

            jwks_uri: resolveURL(baseURL, 'jwks'),

            response_types_supported: [
                OAuth2AuthorizationResponseType.CODE,
                OAuth2AuthorizationResponseType.TOKEN,
                OAuth2AuthorizationResponseType.NONE,
            ],

            subject_types_supported: [
                'public',
            ],

            id_token_signing_alg_values_supported: [
                'HS256',
                'HS384',
                'HS512',
                'RS256',
                'RS384',
                'RS512',
                'none',
            ],

            token_endpoint: resolveURL(baseURL, 'token'),

            introspection_endpoint: resolveURL(baseURL, 'token/introspect'),

            revocation_endpoint: resolveURL(baseURL, 'token'),

            // -----------------------------------------------------------

            service_documentation: 'https://authup.org/',

            userinfo_endpoint: resolveURL(baseURL, 'users/@me'),
        };
    }
}
