/*
 * Copyright (c) 2024-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2AuthorizationCodeRequest } from '@authup/core-kit';
import { nullifyEmptyObjectProperties } from '../../../../utils';
import { OAuth2BaseAPI } from '../base';
import type { IOAuth2AuthorizeAPI, OAuth2AuthorizeParameters } from '../types';

function scopeToString(scope: string | string[]) : string {
    if (typeof scope === 'string') {
        return scope;
    }

    return [...new Set(scope)].join(' ');
}

export class OAuth2AuthorizeAPI extends OAuth2BaseAPI implements IOAuth2AuthorizeAPI {
    /**
     * Build an authorize url based on the input parameters.
     *
     * @param parameters
     */
    buildURL(parameters: OAuth2AuthorizeParameters = {}) : string {
        let baseURL : string;
        if (this.options.authorizationEndpoint) {
            baseURL = this.options.authorizationEndpoint;
        } else {
            baseURL = new URL('authorize', this.client.getBaseURL()).href;
        }

        const output = new URL(baseURL);

        const responseType = parameters.response_type || 'code';
        output.searchParams.set(
            'response_type',
            Array.isArray(responseType) ? scopeToString(responseType) : responseType,
        );

        const clientId = parameters.client_id || this.options.clientId;
        if (clientId) {
            output.searchParams.set('client_id', clientId);
        }

        const redirectUri = parameters.redirect_uri || this.options.redirectUri;
        if (redirectUri) {
            output.searchParams.set('redirect_uri', redirectUri);
        }

        if (parameters.response_mode) {
            output.searchParams.set('response_mode', parameters.response_mode);
        }

        const scope = parameters.scope || this.options.scope;
        if (scope) {
            output.searchParams.set('scope', scopeToString(scope));
        }

        if (parameters.state) {
            output.searchParams.set('state', parameters.state);
        }

        if (parameters.code_challenge) {
            output.searchParams.set('code_challenge', parameters.code_challenge);
        }

        if (parameters.code_challenge_method) {
            output.searchParams.set('code_challenge_method', parameters.code_challenge_method);
        }

        return output.href;
    }

    async confirm(
        data: OAuth2AuthorizationCodeRequest,
    ) : Promise<{ url: string }> {
        const response = await this.client.post(
            'authorize',
            nullifyEmptyObjectProperties(data),
        );

        return response.data;
    }
}
