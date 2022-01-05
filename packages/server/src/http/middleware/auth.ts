/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { NextFunction, Request, Response } from 'express';
import { getCustomRepository, getRepository } from 'typeorm';
import {
    AbilityManager,
    AuthorizationHeader,
    parseAuthorizationHeader,
    stringifyAuthorizationHeader,
} from '@typescript-auth/core';
import { Client, MASTER_REALM_ID, TokenPayload } from '@typescript-auth/common';
import { UnauthorizedError } from '@typescript-error/http';
import { ExpressRequest } from '../type';
import { verifyToken } from '../../security';
import { UserRepository } from '../../domains/user/repository';

export type AuthMiddlewareOptions = {
    parseCookie?: (request: Request) => string | undefined,

    authenticateWithCookie?: (request: Request, value: unknown) => Promise<void>,
    authenticateWithAuthorizationHeader?: (request: Request, value: AuthorizationHeader) => Promise<void>
};

export function setupAuthMiddleware(middlewareOptions: AuthMiddlewareOptions) {
    return async (request: Request, response: Response, next: NextFunction) => {
        try {
            let { authorization: headerValue } = request.headers;

            if (typeof middlewareOptions.parseCookie === 'function') {
                const cookie: unknown = middlewareOptions.parseCookie(request);

                if (typeof middlewareOptions.authenticateWithCookie === 'function') {
                    await middlewareOptions.authenticateWithCookie(request, cookie);
                    next();
                    return;
                }

                // if authenticateWithCookie function not defined, try to use cookie string as bearer token.
                if (typeof cookie === 'string') {
                    headerValue = stringifyAuthorizationHeader({ type: 'Bearer', token: cookie });
                }
            }

            if (typeof headerValue !== 'string') {
                next();
                return;
            }

            const header = parseAuthorizationHeader(headerValue);

            if (typeof middlewareOptions.authenticateWithAuthorizationHeader === 'function') {
                await middlewareOptions.authenticateWithAuthorizationHeader(request, header);
            }

            next();
        } catch (e) {
            next(e);
        }
    };
}

export async function authenticateWithAuthorizationHeader(
    request: ExpressRequest,
    value: AuthorizationHeader,
    options: {
        rsaKeyPairPath: string
    },
): Promise<void> {
    // eslint-disable-next-line default-case
    switch (value.type) {
        case 'Bearer': {
            let tokenPayload: TokenPayload;

            try {
                tokenPayload = await verifyToken(value.token, {
                    directory: options.rsaKeyPairPath,
                });
            } catch (e) {
                return;
            }

            const { sub: userId } = tokenPayload;

            if (typeof userId === 'undefined' || typeof tokenPayload.remoteAddress !== 'string') {
                return;
            }

            const userRepository = getCustomRepository<UserRepository>(UserRepository);
            const userQuery = userRepository.createQueryBuilder('user')
                .addSelect('user.email')
                .where('user.id = :id', { id: userId });

            const user = await userQuery.getOne();

            if (typeof user === 'undefined') {
                throw new UnauthorizedError();
            }

            const permissions = await userRepository.getOwnedPermissions(user.id);

            request.user = user;
            request.userId = user.id;
            request.realmId = user.realm_id;

            request.ability = new AbilityManager(permissions);
            break;
        }
        case 'Basic': {
            const clientRepository = getRepository(Client);
            const client = await clientRepository.findOne({
                id: value.username,
                secret: value.password,
            });

            if (typeof client !== 'undefined') {
                request.clientId = client.id;
                request.realmId = client.realm_id;
                request.ability = new AbilityManager([]);

                return;
            }

            const userRepository = getCustomRepository<UserRepository>(UserRepository);
            const user = await userRepository.verifyCredentials(value.username, value.password);

            if (typeof user === 'undefined') {
                throw new UnauthorizedError();
            }

            const permissions = await userRepository.getOwnedPermissions(user.id);

            request.user = user;
            request.userId = user.id;
            request.realmId = user.realm_id;

            request.ability = new AbilityManager(permissions);
            break;
        }
    }
}

export function parseCookie(request: any): string | undefined {
    try {
        if (typeof request.cookies?.auth_token !== 'undefined') {
            const { access_token: accessToken } = JSON.parse(request.cookies?.auth_token);

            return accessToken;
        }
    } catch (e) {
        // don't handle error, this is just fine :)
    }

    return undefined;
}
