/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { HeaderName, stringifyAuthorizationHeader } from 'hapic';
import type { RequestTransformer } from 'hapic';
import { BaseAPI } from '../../../base';
import type {
    DeviceAuthorizationDecisionResponse,
    DeviceAuthorizationInfo,
    DeviceAuthorizationVerifyPayload,
    IOAuth2DeviceAuthorizationAPI,
    OAuth2DeviceAuthorizationParameters,
    OAuth2DeviceAuthorizationResponse,
    OAuth2TokenRequestOptions,
} from '../types';

function buildURLSearchParams(parameters: OAuth2DeviceAuthorizationParameters) : URLSearchParams {
    const output = new URLSearchParams();

    const entries = Object.entries(parameters);
    for (const [key, value] of entries) {
        if (typeof value === 'string') {
            if (value) {
                output.append(key, value);
            }
        } else if (Array.isArray(value)) {
            const str = value.filter((el) => el).join(' ');
            if (str) {
                output.append(key, str);
            }
        }
    }

    return output;
}

/**
 * The header semantics @hapic/oauth2 applies to every token-API request
 * (`transformHeadersForTokenAPIRequest`), mirrored because that helper is
 * not exported: without the delete, a client carrying its own bearer or
 * Basic header would send it next to the body credentials, which the
 * endpoint refuses as mixed authentication.
 */
function createRequestTransformer(
    parameters: OAuth2DeviceAuthorizationParameters,
    options: OAuth2TokenRequestOptions,
) : RequestTransformer {
    const clientId = options.clientId || parameters.client_id;
    const clientSecret = options.clientId ? options.clientSecret : parameters.client_secret;

    return (data, headers) => {
        headers.set(HeaderName.CONTENT_TYPE, 'application/x-www-form-urlencoded');

        if (!(options.authorizationHeaderInherit && headers.has(HeaderName.AUTHORIZATION))) {
            headers.delete(HeaderName.AUTHORIZATION);

            if (options.authorizationHeader) {
                headers.set(
                    HeaderName.AUTHORIZATION,
                    typeof options.authorizationHeader === 'string' ?
                        options.authorizationHeader :
                        stringifyAuthorizationHeader(options.authorizationHeader),
                );
            } else if (clientId && clientSecret && options.clientCredentialsAsHeader) {
                headers.set(HeaderName.AUTHORIZATION, stringifyAuthorizationHeader({
                    type: 'Basic',
                    username: clientId,
                    password: clientSecret,
                }));
            }
        }

        if (options.clientCredentialsAsHeader && data instanceof URLSearchParams) {
            data.delete('client_id');
            data.delete('client_secret');
        }

        return data;
    };
}

export class OAuth2DeviceAuthorizationAPI extends BaseAPI implements IOAuth2DeviceAuthorizationAPI {
    async create(
        parameters: OAuth2DeviceAuthorizationParameters,
        options: OAuth2TokenRequestOptions = {},
    ) : Promise<OAuth2DeviceAuthorizationResponse> {
        const response = await this.client.post(
            'device_authorization',
            buildURLSearchParams(parameters),
            {
                transform: createRequestTransformer(parameters, options),
                headers: { [HeaderName.ACCEPT]: 'application/json' },
            },
        );

        return response.data;
    }

    async lookup(data: DeviceAuthorizationVerifyPayload) : Promise<DeviceAuthorizationInfo> {
        const response = await this.client.post('device_authorization/lookup', data);

        return response.data;
    }

    async approve(data: DeviceAuthorizationVerifyPayload) : Promise<DeviceAuthorizationDecisionResponse> {
        const response = await this.client.post('device_authorization/approve', data);

        return response.data;
    }

    async deny(data: DeviceAuthorizationVerifyPayload) : Promise<DeviceAuthorizationDecisionResponse> {
        const response = await this.client.post('device_authorization/deny', data);

        return response.data;
    }
}
