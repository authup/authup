/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DeviceAuthorizationAPI } from '@hapic/oauth2';
import type {
    DeviceAuthorizationDecisionResponse,
    DeviceAuthorizationInfo,
    DeviceAuthorizationVerifyPayload,
    IOAuth2DeviceAuthorizationAPI,
    OAuth2DeviceAuthorizationParameters,
    OAuth2DeviceAuthorizationResponse,
    OAuth2TokenRequestOptions,
} from '../types';
import type { APIRequestOptions } from '../../../types-base';
import { buildRequestConfig } from '../../../utils';

export class OAuth2DeviceAuthorizationAPI extends DeviceAuthorizationAPI implements IOAuth2DeviceAuthorizationAPI {
    override async create(
        parameters: OAuth2DeviceAuthorizationParameters = {},
        options: OAuth2TokenRequestOptions = {},
    ) : Promise<OAuth2DeviceAuthorizationResponse> {
        // RFC 8628 leaves the last two optional; authup's endpoint always
        // answers both, which is what the response type states
        return await super.create(parameters, options) as OAuth2DeviceAuthorizationResponse;
    }

    async lookup(data: DeviceAuthorizationVerifyPayload, options?: APIRequestOptions) : Promise<DeviceAuthorizationInfo> {
        const response = await this.client.post('device_authorization/lookup', data, buildRequestConfig(options));

        return response.data;
    }

    async approve(data: DeviceAuthorizationVerifyPayload, options?: APIRequestOptions) : Promise<DeviceAuthorizationDecisionResponse> {
        const response = await this.client.post('device_authorization/approve', data, buildRequestConfig(options));

        return response.data;
    }

    async deny(data: DeviceAuthorizationVerifyPayload, options?: APIRequestOptions) : Promise<DeviceAuthorizationDecisionResponse> {
        const response = await this.client.post('device_authorization/deny', data, buildRequestConfig(options));

        return response.data;
    }
}
