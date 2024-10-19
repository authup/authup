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
import { readOAuth2TokenPayload, useOAuth2Cache } from '../../../../oauth2';
import { extractTokenFromRequest } from '../utils';

export async function revokeTokenRouteHandler(
    req: Request,
    res: Response,
) {
    const token = await extractTokenFromRequest(req);
    const dataSource = await useDataSource();

    const payload = await readOAuth2TokenPayload(token, {
        skipCacheSet: true,
    });

    if (!payload.jti) {
        throw new BadRequestError('The token identitifer (jti) could not be read.');
    }

    const oauth2Cache = useOAuth2Cache();
    await oauth2Cache.dropClaimsById(payload.jti);
    await oauth2Cache.dropIdByToken(payload.jti);

    if (payload.kind === OAuth2TokenKind.REFRESH) {
        const refreshTokenRepository = dataSource.getRepository(OAuth2RefreshTokenEntity);
        const refreshToken = await refreshTokenRepository.findOneBy({
            id: payload.jti,
        });

        if (!refreshToken) {
            throw new BadRequestError('The refresh token does not exist.');
        }

        await refreshTokenRepository.remove(refreshToken);

        return send(res);
    }

    if (payload.kind === OAuth2TokenKind.ACCESS) {
        // todo: revoke access token
    }

    throw new BadRequestError(`The token type ${payload.kind} is not supported.`);
}
