/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Application } from 'express';
import bodyParser from 'body-parser';
import { AuthorizationHeader } from '@typescript-auth/core';
import { ServerSetupOptions } from './type';
import {
    ExpressRequest,
    authenticateWithAuthorizationHeader, parseCookie, responseMiddleware, setupAuthMiddleware,
} from '../index';

export function setupHTTPServer(
    router: Application,
    options: ServerSetupOptions,
) {
    if (options.withBodyParserMiddleware) {
        // Payload parser
        router.use(bodyParser.urlencoded({ extended: false }));
        router.use(bodyParser.json());
    }

    if (options.withResponseMiddleware) {
        router.use(responseMiddleware);
    }

    if (options.withAuthMiddleware) {
        router.use(setupAuthMiddleware({
            parseCookie: (request: ExpressRequest) => parseCookie(request),
            authenticateWithAuthorizationHeader: (
                request: ExpressRequest,
                value: AuthorizationHeader,
            ) => authenticateWithAuthorizationHeader(request, value, {
                rsaKeyPairPath: options.rsaKeyPairPath,
            }),
        }));
    }
}
