/*
 * Copyright (c) 2024-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2AuthorizationCodeRequest } from '@authup/core-kit';
import { AuthorizeAPI } from '@hapic/oauth2';
import { nullifyEmptyObjectProperties } from '../../../../utils';
import type { AuthorizeInfo, IOAuth2AuthorizeAPI } from '../types';

export class OAuth2AuthorizeAPI extends AuthorizeAPI implements IOAuth2AuthorizeAPI {
    /**
     * The render input of the hosted `/authorize` page, as JSON. The query
     * is the page's own, `provider` and the `error` marker included: the
     * answer is derived from all of it, so none of it may be dropped.
     *
     * Pass the raw search string to forward a browser's query untouched
     * (what a renderer in front of this endpoint wants), or a record to
     * build one. A record is serialized, so a value that is neither a
     * scalar nor an array of scalars does not survive the trip.
     *
     * A refused request answers 200 with `error` filled, like the page.
     */
    async getInfo(
        query?: string | Record<string, any>,
    ) : Promise<AuthorizeInfo> {
        let search : string;

        if (typeof query === 'string') {
            search = query.replace(/^\?/, '');
        } else {
            const params = new URLSearchParams();

            const entries = Object.entries(query || {});
            for (const [key, value] of entries) {
                const values = Array.isArray(value) ? value : [value];
                for (const item of values) {
                    if (typeof item !== 'undefined' && item !== null) {
                        params.append(key, `${item}`);
                    }
                }
            }

            search = params.toString();
        }

        const response = await this.client.get(`authorize/info${search ? `?${search}` : ''}`);

        return response.data;
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
