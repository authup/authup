/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { CookieName } from '@authup/core';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { TokenVerificationData } from '../../verifier';
import { TokenVerifier } from '../../verifier';
import type { HTTPMiddleware, HTTPMiddlewareOptions, HTTPNext } from './type';

export function createHTTPMiddleware(context: HTTPMiddlewareOptions) : HTTPMiddleware {
    let tokenVerifier : TokenVerifier;
    if (context.tokenVerifier instanceof TokenVerifier) {
        tokenVerifier = context.tokenVerifier;
    } else {
        tokenVerifier = new TokenVerifier(context.tokenVerifier);
    }

    return async (req: IncomingMessage, res: ServerResponse, next: HTTPNext) => {
        let { authorization } = req.headers;

        if (!authorization && context.tokenByCookie) {
            const cookieToken = context.tokenByCookie(req, CookieName.ACCESS_TOKEN);
            if (cookieToken) {
                if (!cookieToken.startsWith('Bearer')) {
                    authorization = `Bearer ${cookieToken}`;
                } else {
                    authorization = cookieToken;
                }
            }
        }

        if (typeof authorization !== 'string') {
            next();
            return;
        }

        const spaceIndex = authorization.indexOf(' ');
        if (spaceIndex === -1) {
            throw new Error('The authorization header is malformed.');
        }

        const type = authorization.substring(0, spaceIndex);
        if (type !== 'Bearer') {
            throw new Error('Only Bearer tokens are accepted as authentication method.');
        }

        const token = authorization.substring(spaceIndex + 1);
        if (token.length === 0) {
            throw new Error('The bearer token value is empty.');
        }

        let data : TokenVerificationData | undefined;

        try {
            data = await tokenVerifier.verify(token);
        } catch (e) {
            next(e);

            return;
        }

        context.tokenVerifierHandler(req, data);

        next();
    };
}
