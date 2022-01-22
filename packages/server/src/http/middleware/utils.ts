/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import swaggerUi from 'swagger-ui-express';
import { Application } from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import { AuthorizationHeader } from '@trapi/client';
import path from 'path';
import { existsSync } from 'fs';
import {
    ExpressRequest,
    MiddlewareRegistrationOptions, authenticateWithAuthorizationHeader, parseCookie, responseMiddleware, setupAuthMiddleware,
} from '../index';

export function registerMiddlewares(
    router: Application,
    options: MiddlewareRegistrationOptions,
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

        if (typeof options.auth !== 'boolean') {
            if (options.auth.writableDirectoryPath) {
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

    if (options.swaggerDocumentation) {
        let docsPath = '/docs';
        let writableDirectoryPath = path.join(process.cwd(), 'writable');

        if (typeof options.swaggerDocumentation !== 'boolean') {
            if (options.swaggerDocumentation.path) {
                docsPath = options.swaggerDocumentation.path;
            }

            if (options.swaggerDocumentation.writableDirectoryPath) {
                writableDirectoryPath = options.swaggerDocumentation.writableDirectoryPath;
            }
        }

        const swaggerDocumentPath: string = path.join(writableDirectoryPath, 'swagger.json');

        if (existsSync(swaggerDocumentPath)) {
            // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require, import/no-dynamic-require
            const swaggerDocument = require(swaggerDocumentPath);

            router.use(
                docsPath,
                swaggerUi.serve,
                swaggerUi.setup(swaggerDocument, {
                    swaggerOptions: {
                        withCredentials: true,
                        plugins: [
                            () => ({
                                components: { Topbar: (): any => null },
                            }),
                        ],
                    },
                }),
            );
        }
    }
}
