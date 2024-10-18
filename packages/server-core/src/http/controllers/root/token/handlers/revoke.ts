/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { OAuth2TokenKind } from '@authup/kit';
import { BadRequestError } from '@ebec/http';
import type { Request, Response } from 'routup';
import { send } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { OAuth2RefreshTokenEntity } from '../../../../../domains';
import { OAuth2RefreshTokenCache, readOAuth2TokenPayload } from '../../../../oauth2';
import { extractTokenFromRequest } from '../utils';

export async function revokeTokenRouteHandler(
    req: Request,
    res: Response,
) {
    const token = await extractTokenFromRequest(req);
    const dataSource = await useDataSource();

    const tokenPayload = await readOAuth2TokenPayload(token);
    if (!tokenPayload.jti) {
        throw new BadRequestError('The token identitifer (jti) could not be read.');
    }

    if (tokenPayload.kind === OAuth2TokenKind.REFRESH) {
        const refreshTokenRepository = dataSource.getRepository(OAuth2RefreshTokenEntity);
        const refreshToken = await refreshTokenRepository.findOneBy({
            id: tokenPayload.jti,
        });

        if (!refreshToken) {
            throw new BadRequestError('The refresh token does not exist.');
        }

        const refreshTokenCache = new OAuth2RefreshTokenCache();
        await refreshTokenCache.drop(refreshToken.id);

        await refreshTokenRepository.remove(refreshToken);

        return send(res);
    }

    if (tokenPayload.kind === OAuth2TokenKind.ACCESS) {
        // todo: revoke access token
    }

    throw new BadRequestError(`The token type ${tokenPayload.kind} is not supported.`);
}
