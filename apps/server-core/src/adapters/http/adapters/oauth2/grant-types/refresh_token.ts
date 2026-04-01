/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse } from '@authup/specs';
import { useRequestBody } from '@routup/basic/body';
import type { Request } from 'routup';
import { getRequestHeader, getRequestIP } from 'routup';
import { OAuth2RefreshTokenGrant } from '../../../../../core/index.ts';
import type { IHTTPOAuth2Grant } from './types.ts';

export class HTTPOAuth2RefreshTokenGrant extends OAuth2RefreshTokenGrant implements IHTTPOAuth2Grant {
    async runWithRequest(req: Request): Promise<OAuth2TokenGrantResponse> {
        const refreshToken = useRequestBody(req, 'refresh_token');

        return this.runWith(refreshToken, {
            ipAddress: getRequestIP(req, { trustProxy: true }),
            userAgent: getRequestHeader(req, 'user-agent'),
        });
    }
}
