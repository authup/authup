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
import { OAuth2RefreshTokenEntity } from '../../../../../database/domains';
import { OAuth2TokenManager } from '../../../../oauth2';
import { extractTokenFromRequest } from '../utils';

export async function revokeTokenRouteHandler(
    req: Request,
    res: Response,
) {
    const token = await extractTokenFromRequest(req);
    const dataSource = await useDataSource();

    const tokenManager = new OAuth2TokenManager();
    const payload = await tokenManager.verify(token);
    if (!payload.jti) {
        throw new BadRequestError('The json token identifier (jti) is not valid.');
    }

    if (payload.kind === OAuth2TokenKind.REFRESH) {
        const refreshTokenRepository = dataSource.getRepository(OAuth2RefreshTokenEntity);
        const refreshToken = await refreshTokenRepository.findOneBy({
            id: payload.jti,
        });

        if (!refreshToken) {
            throw new BadRequestError('The refresh token does not exist.');
        }

        await refreshTokenRepository.remove(refreshToken);
        await tokenManager.setInactive(token);

        return send(res);
    }

    if (payload.kind === OAuth2TokenKind.ACCESS) {
        await tokenManager.setInactive(token);

        return send(res);
    }

    throw new BadRequestError(`The token type ${payload.kind} is not supported.`);
}
