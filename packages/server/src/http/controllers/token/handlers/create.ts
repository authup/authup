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
    Oauth2TokenResponse, TokenPayload,
} from '@typescript-auth/common';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { createToken } from '../../../../security';
import { UserRepository } from '../../../../domains';
import { TokenRouteCreateContext } from './type';

export async function createTokenRouteHandler(
    req: ExpressRequest,
    res: ExpressResponse,
    context: TokenRouteCreateContext,
) : Promise<any> {
    const { username, password } = req.body;

    // try database authentication
    const userRepository = getCustomRepository<UserRepository>(UserRepository);
    const user = await userRepository.verifyCredentials(username, password);

    if (typeof user === 'undefined') {
        throw new BadRequestError('The credentials are not valid.');
    }

    const expiresIn: number = context.maxAge;

    const tokenPayload: TokenPayload = {
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
