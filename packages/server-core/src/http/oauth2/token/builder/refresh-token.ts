/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenPayload } from '@authup/schema';
import { OAuth2TokenKind } from '@authup/schema';
import { buildOAuth2AccessTokenPayload } from './access-token';
import type { OAuth2RefreshTokenBuildContext } from './type';

export function buildOAuth2RefreshTokenPayload(
    context: OAuth2RefreshTokenBuildContext,
) : OAuth2TokenPayload {
    return {
        ...buildOAuth2AccessTokenPayload(context),
        kind: OAuth2TokenKind.REFRESH,
    };
}
