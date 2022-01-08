/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { NextFunction, Request, Response } from 'express';
import { Middleware } from '@decorators/express';
import { getCustomRepository } from 'typeorm';
import {
    AbilityManager,
    AuthorizationHeader,
    parseAuthorizationHeader,
    stringifyAuthorizationHeader,
} from '@typescript-auth/core';
import { TokenPayload } from '@typescript-auth/domains';
import { UnauthorizedError } from '@typescript-error/http';
import { ExpressNextFunction, ExpressRequest, ExpressResponse } from '../type';
import { verifyToken } from '../../utils';
import { UserRepository } from '../../domains';
import { ClientRepository } from '../../domains/client';

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

export function forceLoggedIn(req: ExpressRequest, res: ExpressResponse, next: ExpressNextFunction) {
    if (
        typeof req.userId === 'undefined' &&
        typeof req.clientId === 'undefined'
    ) {
        throw new UnauthorizedError();
    }

    next();
}

export class ForceLoggedInMiddleware implements Middleware {
    // eslint-disable-next-line class-methods-use-this
    public use(request: ExpressRequest, response: ExpressResponse, next: ExpressNextFunction) {
        return forceLoggedIn(request, response, next);
    }
}

export async function authenticateWithAuthorizationHeader(
    request: ExpressRequest,
    value: AuthorizationHeader,
    options: {
        writableDirectoryPath: string
    },
): Promise<void> {
    // eslint-disable-next-line default-case
    switch (value.type) {
        case 'Bearer': {
            let tokenPayload: TokenPayload;

            try {
                tokenPayload = await verifyToken(value.token, {
                    directory: options.writableDirectoryPath,
                });
            } catch (e) {
                return;
            }

            const { sub: userId, subKind } = tokenPayload;

            // todo: handle client ;)

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
            const clientRepository = getCustomRepository<ClientRepository>(ClientRepository);
            const client = await clientRepository.findOne({
                id: value.username,
            });

            if (typeof client !== 'undefined') {
                let permissions = [];

                if (client.user_id) {
                    const userRepository = getCustomRepository<UserRepository>(UserRepository);
                    permissions = await userRepository.getOwnedPermissions(client.user_id);
                } else {
                    permissions = await clientRepository.getOwnedPermissions(client.id);
                }

                request.clientId = client.id;
                request.userId = client.user_id;
                request.realmId = client.realm_id;
                request.ability = new AbilityManager(permissions);

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
