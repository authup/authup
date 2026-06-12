/*
 * Copyright (c) 2024-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AuthorizationHeader } from 'hapic';
import { HeaderName, stringifyAuthorizationHeader } from 'hapic';
import { OAuth2BaseAPI } from '../base';
import type { IOAuth2UserInfoAPI } from '../types';

export class OAuth2UserInfoAPI extends OAuth2BaseAPI implements IOAuth2UserInfoAPI {
    /**
     * @throws Error
     * @param header
     */
    async get<T extends Record<string, any> = Record<string, any>>(
        header?: string | AuthorizationHeader,
    ) : Promise<T> {
        const headers : Record<string, string> = { [HeaderName.ACCEPT]: 'application/json' };

        if (header) {
            if (typeof header === 'string') {
                headers.Authorization = !header.includes(' ') ?
                    `Bearer ${header}` :
                    header;
            } else {
                headers.Authorization = stringifyAuthorizationHeader(header);
            }
        }

        const response = await this.client.get(
            this.options.userinfoEndpoint || '/userinfo',
            { headers },
        );

        return response.data;
    }
}
