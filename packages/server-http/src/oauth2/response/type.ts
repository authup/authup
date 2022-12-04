/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { OAuth2TokenPayload } from '@authup/common';
import { OAuth2RefreshTokenEntity } from '@authup/server-database';

export type OAuth2BearerResponseContext = {
    accessToken: Partial<OAuth2TokenPayload>,
    accessTokenMaxAge: number,
    refreshToken?: OAuth2RefreshTokenEntity,
    idToken?: string
};
