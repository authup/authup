/*
 * Copyright (c) 2024-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { OAuth2TokenGrant } from '@authup/specs';
import type { OAuth2TokenGrantResponse } from '@authup/specs';
import { TokenAPI } from '@hapic/oauth2';
import type { TokenGrantParameters } from '@hapic/oauth2';
import type {
    IOAuth2TokenAPI,
    OAuth2TokenDeviceCodeGrantParameters,
    OAuth2TokenGrantParameters,
    OAuth2TokenRequestOptions,
} from '../types';

export class OAuth2TokenAPI extends TokenAPI implements IOAuth2TokenAPI {
    async createWithDeviceCode(
        parameters: Omit<OAuth2TokenDeviceCodeGrantParameters, 'grant_type'>,
        options?: OAuth2TokenRequestOptions,
    ) : Promise<OAuth2TokenGrantResponse> {
        return this.create({
            grant_type: OAuth2TokenGrant.DEVICE_CODE,
            ...parameters,
        }, options);
    }

    override async create(
        parameters: OAuth2TokenGrantParameters,
        options?: OAuth2TokenRequestOptions,
    ) : Promise<OAuth2TokenGrantResponse> {
        return super.create(parameters as TokenGrantParameters, options);
    }
}
