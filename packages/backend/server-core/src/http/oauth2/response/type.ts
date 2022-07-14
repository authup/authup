/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { KeyPairContext } from '@authelion/server-utils';
import { OAuth2AccessTokenEntity } from '../../../domains/oauth2-access-token';
import { OAuth2RefreshTokenEntity } from '../../../domains/oauth2-refresh-token';

export type OAuth2BearerResponseContext = {
    keyPairOptions?: Partial<KeyPairContext>,
    accessToken: OAuth2AccessTokenEntity,
    refreshToken?: OAuth2RefreshTokenEntity
};
