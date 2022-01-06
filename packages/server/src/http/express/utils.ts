/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Application } from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import { AuthorizationHeader } from '@typescript-auth/core';
import {
    ExpressRequest,
    authenticateWithAuthorizationHeader, parseCookie, responseMiddleware, setupAuthMiddleware,
} from '../index';
import {ExpressAppMiddlewareOptions} from "./type";
import path from "path";

export function setupExpressMiddlewares(
    router: Application,
    options: ExpressAppMiddlewareOptions,
) {
    if (options.bodyParser) {
        // Payload parser
        router.use(bodyParser.urlencoded({ extended: false }));
        router.use(bodyParser.json());
    }

    router.use(cookieParser());

    if (options.response) {
        router.use(responseMiddleware);
    }

    if (options.auth) {
        let writableDirectoryPath = path.join(process.cwd(), 'writable');

        if(typeof options.auth !== 'boolean') {
            if(options.auth.writableDirectoryPath) {
                writableDirectoryPath = options.auth.writableDirectoryPath;
            }
        }

        router.use(setupAuthMiddleware({
            parseCookie: (request: ExpressRequest) => parseCookie(request),
            authenticateWithAuthorizationHeader: (
                request: ExpressRequest,
                value: AuthorizationHeader,
            ) => authenticateWithAuthorizationHeader(request, value, {
                writableDirectoryPath,
            }),
        }));
    }
}
