/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenPayload } from '@authup/security';

export type OAuth2BearerResponseBuildContext = {
    accessToken: string,
    accessTokenPayload?: OAuth2TokenPayload,

    refreshToken?: string,
    refreshTokenPayload?: OAuth2TokenPayload,

    idToken?: string,

    scope?: string
};
