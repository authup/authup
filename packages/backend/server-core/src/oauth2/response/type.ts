/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { OAuth2AccessTokenEntity, OAuth2RefreshTokenEntity } from '../../domains';

export type OAuth2BearerResponseContext = {
    accessToken: OAuth2AccessTokenEntity,
    refreshToken?: OAuth2RefreshTokenEntity,
    idToken?: string
};
