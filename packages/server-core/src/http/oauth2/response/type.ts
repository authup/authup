/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenPayload } from '@authup/core-kit';

export type OAuth2BearerResponseBuildContext = {
    accessToken: Partial<OAuth2TokenPayload> | string,
    accessTokenMaxAge?: number,

    refreshToken?: Partial<OAuth2TokenPayload> | string,
    refreshTokenMaxAge?: number,

    idToken?: Partial<OAuth2TokenPayload> | string,
    idTokenMaxAge?: number,

    realmId?: string,

    scope?: string
};
