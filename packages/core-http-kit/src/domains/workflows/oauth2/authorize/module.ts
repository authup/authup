/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2AuthorizationCodeRequest } from '@authup/core-kit';
import { AuthorizeAPI } from '@hapic/oauth2';
import { nullifyEmptyObjectProperties } from '../../../../utils';

export class OAuth2AuthorizeAPI extends AuthorizeAPI {
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
