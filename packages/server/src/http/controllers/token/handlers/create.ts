/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/* istanbul ignore next */
import { getCustomRepository, getRepository } from 'typeorm';
import { BadRequestError } from '@typescript-error/http';
import { Oauth2Client } from '@typescript-auth/core';
import {
    MASTER_REALM_ID, OAuth2Provider, OAuth2ProviderAccount, Oauth2TokenResponse, TokenPayload,
} from '@typescript-auth/common';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { createToken } from '../../../../security';
import { createOauth2ProviderAccountWithToken } from '../../../../domains/oauth2-provider-account/utils';
import { UserRepository } from '../../../../domains/user/repository';
import { TokenRouteCreateContext } from './type';

async function grantTokenWithMasterProvider(username: string, password: string) : Promise<OAuth2ProviderAccount | undefined> {
    const providerRepository = getRepository(OAuth2Provider);
    const providers = await providerRepository.createQueryBuilder('provider')
        .leftJoinAndSelect('provider.realm', 'realm')
        .andWhere('provider.realm_id = :realmId', { realmId: MASTER_REALM_ID })
        .getMany();

    for (let i = 0; i < providers.length; i++) {
        const oauth2Client = new Oauth2Client(providers[i]);

        try {
            const tokenResponse = await oauth2Client.getTokenWithPasswordGrant({
                username,
                password,
            });

            return await createOauth2ProviderAccountWithToken(providers[i], tokenResponse);
        } catch (e) {
            // ...
            // todo: don't handle error, maybe log it.
        }
    }

    return undefined;
}

export async function createTokenRouteHandler(
    req: ExpressRequest,
    res: ExpressResponse,
    context: TokenRouteCreateContext,
) : Promise<any> {
    const { username, password } = req.body;

    let userId: number | undefined;

    // try database authentication
    const userRepository = getCustomRepository<UserRepository>(UserRepository);
    const user = await userRepository.verifyCredentials(username, password);

    if (typeof user !== 'undefined') {
        userId = user.id;
    }

    /* istanbul ignore next */
    if (typeof userId === 'undefined') {
        const userAccount = await grantTokenWithMasterProvider(username, password);
        if (typeof userAccount !== 'undefined') {
            userId = userAccount?.user_id ?? userAccount?.user?.id;
        }
    }

    if (typeof userId === 'undefined') {
        throw new BadRequestError('The credentials are not valid.');
    }

    const expiresIn: number = context.maxAge;

    const tokenPayload: TokenPayload = {
        iss: context.selfUrl,
        sub: userId,
        remoteAddress: req.ip,
    };

    const token = await createToken(tokenPayload, expiresIn, { directory: context.writableDirectoryPath });

    return res.respond({
        data: {
            access_token: token,
            expires_in: expiresIn,
        } as Oauth2TokenResponse,
    });
}
