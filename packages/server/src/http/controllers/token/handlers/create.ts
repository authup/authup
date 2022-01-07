/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/* istanbul ignore next */
import { getCustomRepository } from 'typeorm';
import { BadRequestError } from '@typescript-error/http';
import {
    Oauth2TokenResponse, TokenGrant, TokenGrantType, TokenPayload,
} from '@typescript-auth/domains';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { createToken } from '../../../../security';
import { UserRepository } from '../../../../domains';
import { TokenRouteCreateContext } from './type';
import { ClientRepository } from '../../../../domains/client';

function determineGrantType(req: ExpressRequest) : TokenGrantType {
    const { grant_type: grantType } = req.body;

    const allowed = Object.values(TokenGrant);
    if (allowed.indexOf(grantType) !== -1) {
        return grantType;
    }

    return TokenGrant.PASSWORD;
}

export async function createTokenRouteHandler(
    req: ExpressRequest,
    res: ExpressResponse,
    context: TokenRouteCreateContext,
) : Promise<any> {
    const expiresIn: number = context.maxAge;

    const grantType = determineGrantType(req);
    switch (grantType) {
        case TokenGrant.CLIENT_CREDENTIALS: {
            const { client_id: clientId, client_secret: clientSecret } = req.body;

            const clientRepository = getCustomRepository<ClientRepository>(ClientRepository);
            const client = await clientRepository.verifyCredentials(clientId, clientSecret);

            if (typeof client === 'undefined') {
                throw new BadRequestError('The credentials are not valid.');
            }

            const tokenPayload: TokenPayload = {
                type: 'client',
                iss: context.selfUrl,
                sub: client.id,
                remoteAddress: req.ip,
            };

            const token = await createToken(
                tokenPayload,
                expiresIn,
                {
                    directory: context.writableDirectoryPath,
                },
            );

            return res.respond({
                data: {
                    access_token: token,
                    expires_in: expiresIn,
                } as Oauth2TokenResponse,
            });
        }
        default: {
            const { username, password } = req.body;

            // try database authentication
            const userRepository = getCustomRepository<UserRepository>(UserRepository);
            const user = await userRepository.verifyCredentials(username, password);

            if (typeof user === 'undefined') {
                throw new BadRequestError('The credentials are not valid.');
            }

            const tokenPayload: TokenPayload = {
                type: 'user',
                iss: context.selfUrl,
                sub: user.id,
                remoteAddress: req.ip,
            };

            const token = await createToken(
                tokenPayload,
                expiresIn,
                {
                    directory: context.writableDirectoryPath,
                },
            );

            return res.respond({
                data: {
                    access_token: token,
                    expires_in: expiresIn,
                } as Oauth2TokenResponse,
            });
        }
    }
}
