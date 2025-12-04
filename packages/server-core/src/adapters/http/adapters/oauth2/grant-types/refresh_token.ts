/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse } from '@authup/specs';
import { useRequestBody } from '@routup/basic/body';
import type { Request } from 'routup';
import { getRequestIP } from 'routup';
import { OAuth2RefreshTokenGrant } from '../../../../../core';
import type { IHTTPGrant } from './types';

export class HTTPOAuth2RefreshTokenGrant extends OAuth2RefreshTokenGrant implements IHTTPGrant {
    async runWithRequest(req: Request): Promise<OAuth2TokenGrantResponse> {
        const refreshToken = useRequestBody(req, 'refresh_token');

        return this.runWith(refreshToken, {
            remote_address: getRequestIP(req, { trustProxy: true }),
        });
    }
}
