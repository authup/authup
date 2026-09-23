/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AuthorizationCatalog, AuthorizationCheckPermissions } from '@authup/access';
import { BaseAPI } from '../../base';
import { buildAuthorizationHeaderRequestConfig } from '../../utils';
import type {
    AuthorizationCheckPayload,
    AuthorizationCheckResponse,
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
    ) : Promise<AuthorizationCheckPermissions> {
        const { data } = await this.checkWithMaxAge(payload, options);

        return data;
    }

    async checkWithMaxAge(
        payload: AuthorizationCheckPayload = {},
        options?: AuthorizationRequestOptions,
    ) : Promise<AuthorizationCheckResponse> {
        const response = await this.client.post(
            'authorization/check',
            payload,
            buildAuthorizationHeaderRequestConfig(options),
        );

        const maxAge = readCacheControlMaxAge(response.headers.get('cache-control'));

        return {
            data: response.data,
            ...(typeof maxAge === 'number' ? { maxAge } : {}),
        };
    }
}

function readCacheControlMaxAge(value: string | null) : number | undefined {
    if (!value) {
        return undefined;
    }

    const match = value.match(/(?:^|,)\s*max-age\s*=\s*"?(\d+)"?\s*(?:,|$)/i);
    if (!match) {
        return undefined;
    }

    return Number.parseInt(match[1], 10);
}
