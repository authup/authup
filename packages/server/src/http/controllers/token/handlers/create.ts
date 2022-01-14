/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/* istanbul ignore next */
import { getCustomRepository } from 'typeorm';
import {
    Oauth2TokenResponse, TokenGrant, TokenGrantType, TokenPayload, TokenSubKind,
} from '@typescript-auth/domains';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { createToken } from '../../../../utils';
import { RobotRepository, UserRepository } from '../../../../domains';
import { TokenRouteCreateContext } from './type';
import { CredentialsInvalidError } from '../../../error/credentials-invalid';

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
        case TokenGrant.ROBOT_CREDENTIALS: {
            const { id, secret } = req.body;

            const robotRepository = getCustomRepository<RobotRepository>(RobotRepository);
            const robotEntity = await robotRepository.verifyCredentials(id, secret);

            if (typeof robotEntity === 'undefined') {
                throw new CredentialsInvalidError();
            }

            const tokenPayload: TokenPayload = {
                iss: context.selfUrl,
                sub: robotEntity.id,
                subKind: TokenSubKind.ROBOT,
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
                throw new CredentialsInvalidError();
            }

            const tokenPayload: TokenPayload = {
                iss: context.selfUrl,
                sub: user.id,
                subKind: TokenSubKind.USER,
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
