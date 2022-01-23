import {
    CookieName,
    OAuth2TokenKind,
} from '@typescript-auth/domains';
import { getRepository } from 'typeorm';
import { BadRequestError, NotFoundError } from '@typescript-error/http';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { OAuth2AccessTokenEntity } from '../../../../domains/oauth2-access-token';
import { OAuth2RefreshTokenEntity } from '../../../../domains/oauth2-refresh-token';
import { verifyOAuth2Token } from '../../../oauth2';

export async function deleteTokenRouteHandler(
    req: ExpressRequest,
    res: ExpressResponse,
) : Promise<any> {
    let { id } = req.params;

    if (
        !id &&
        typeof req.token === 'string'
    ) {
        id = req.token;
    }

    if (!id) {
        throw new NotFoundError();
    }

    if (req.token === id) {
        res.cookie(CookieName.ACCESS_TOKEN, null, { maxAge: 0 });
        res.cookie(CookieName.REFRESH_TOKEN, null, { maxAge: 0 });
    }

    const token = await verifyOAuth2Token(id);

    switch (token.kind) {
        case OAuth2TokenKind.ACCESS: {
            const repository = getRepository(OAuth2AccessTokenEntity);
            await repository.remove(token.entity);

            return res.respondDeleted({
                data: token.entity,
            });
        }
        case OAuth2TokenKind.REFRESH: {
            const repository = getRepository(OAuth2RefreshTokenEntity);
            await repository.remove(token.entity);

            return res.respondDeleted({
                data: token.entity,
            });
        }
    }

    throw new BadRequestError();
}
