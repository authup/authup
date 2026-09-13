/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AuthorizationDocument } from '@authup/access';
import type { RequestBaseOptions } from 'hapic';
import { stringifyAuthorizationHeader } from 'hapic';
import { BaseAPI } from '../../base';
import type { AuthorizationRequestOptions, IAuthorizationAPI } from './types';

export class AuthorizationAPI extends BaseAPI implements IAuthorizationAPI {
    async get(options?: AuthorizationRequestOptions) : Promise<AuthorizationDocument> {
        const response = await this.client.get('authorization', buildRequestConfig(options));

        return response.data;
    }
}

function buildRequestConfig(options?: AuthorizationRequestOptions) : RequestBaseOptions | undefined {
    if (!options || !options.authorizationHeader) {
        return undefined;
    }

    return {
        headers: {
            Authorization: typeof options.authorizationHeader === 'string' ?
                options.authorizationHeader :
                stringifyAuthorizationHeader(options.authorizationHeader),
        },
    };
}
