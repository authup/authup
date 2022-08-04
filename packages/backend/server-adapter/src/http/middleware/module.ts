/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    AbilityManager,
    CookieName, OAuth2SubKind,
    OAuth2TokenIntrospectionResponse,
} from '@authelion/common';
import { BadRequestError } from '@typescript-error/http';
import { parseAuthorizationHeader, stringifyAuthorizationHeader } from 'hapic';
import { ExpressNextFunction, ExpressRequest, ExpressResponse } from '../type';
import { HTTPMiddlewareContext } from './type';
import { verifyOAuth2Token } from '../../oauth2';

export function setupHTTPMiddleware(context: HTTPMiddlewareContext) {
    return async (req: ExpressRequest, res: ExpressResponse, next: ExpressNextFunction) => {
        let { authorization: headerValue } = req.headers;

        if (!headerValue) {
            try {
                let value;
                if (context.cookieHandler) {
                    value = context.cookieHandler(req.cookies);
                } else if (
                    req.cookies?.[CookieName.ACCESS_TOKEN] &&
                        typeof req.cookies[CookieName.ACCESS_TOKEN] === 'string'
                ) {
                    value = req.cookies[CookieName.ACCESS_TOKEN];
                }

                if (value) {
                    headerValue = stringifyAuthorizationHeader({ type: 'Bearer', token: value });
                }
            } catch (e) {
                // ...
            }
        }

        if (!headerValue) {
            next();
            return;
        }

        const header = parseAuthorizationHeader(headerValue);

        if (header.type !== 'Bearer') {
            throw new BadRequestError('Only Bearer tokens are accepted as authentication method.');
        }

        let data : OAuth2TokenIntrospectionResponse | undefined;

        try {
            data = await verifyOAuth2Token(header.token, context);
        } catch (e) {
            next(e);

            return;
        }

        switch (data.sub_kind) {
            case OAuth2SubKind.CLIENT:
                req.clientId = data.sub;
                break;
            case OAuth2SubKind.ROBOT:
                req.robotId = data.sub;
                break;
            case OAuth2SubKind.USER:
                req.userId = data.sub;
                break;
        }

        req.realmId = data.realm_id;
        req.token = header.token;
        req.permissions = data.permissions;
        req.ability = new AbilityManager(data.permissions);

        next();
    };
}
