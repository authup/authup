/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { CookieName } from '@authup/core';
import { parseAuthorizationHeader } from 'hapic';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { TokenVerifierOutput } from '../../verifier';
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
            authorization = context.tokenByCookie(req, CookieName.ACCESS_TOKEN);
        }

        if (!authorization) {
            next();
            return;
        }

        const header = parseAuthorizationHeader(authorization);

        if (header.type !== 'Bearer') {
            throw new Error('Only Bearer tokens are accepted as authentication method.');
        }

        let data : TokenVerifierOutput | undefined;

        try {
            data = await tokenVerifier.verify(header.token);
        } catch (e) {
            next(e);

            return;
        }

        context.tokenVerifierHandler(data);

        next();
    };
}
