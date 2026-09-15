/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AuthorizationCatalog, AuthorizationCheckResult } from '@authup/access';
import { BaseAPI } from '../../base';
import { buildAuthorizationHeaderRequestConfig } from '../../utils';
import type {
    AuthorizationCheckPayload,
    AuthorizationRequestOptions,
    IAuthorizationAPI,
} from './types';

export class AuthorizationAPI extends BaseAPI implements IAuthorizationAPI {
    async get(options?: AuthorizationRequestOptions) : Promise<AuthorizationCatalog> {
        const response = await this.client.get('authorization', buildAuthorizationHeaderRequestConfig(options));

        return response.data;
    }

    async check(
        payload: AuthorizationCheckPayload = {},
        options?: AuthorizationRequestOptions,
    ) : Promise<AuthorizationCheckResult> {
        const response = await this.client.post(
            'authorization/check',
            payload,
            buildAuthorizationHeaderRequestConfig(options),
        );

        return response.data;
    }
}
