/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ObjectLiteral } from '@authup/kit';
import path from 'node:path';
import type { Router } from 'routup';
import { resolvePackagePath } from '../../../path';
import {
    registerAssetsMiddleware,
    registerAuthorizationMiddleware,
    registerBasicMiddleware,
    registerCorsMiddleware,
    registerLoggerMiddleware,
    registerPrometheusMiddleware,
    registerRateLimitMiddleware,
    registerSwaggerMiddleware,
} from './built-in';
import {
    isBuiltInMiddlewareEnabled,
    transformBoolToEmptyObject,
} from './utils';

export type HTTPMiddlewareRegistrationOptions = {
    cors?: boolean | ObjectLiteral,
    prometheus?: boolean | ObjectLiteral,
    rateLimit?: boolean | ObjectLiteral,
    swagger?: boolean | ObjectLiteral,

    publicURL?: string
};

export async function registerHTTPMiddlewares(router: Router, ctx: { options : HTTPMiddlewareRegistrationOptions }) {
    const { options } = ctx;

    registerLoggerMiddleware(router);

    if (isBuiltInMiddlewareEnabled(options.cors)) {
        registerCorsMiddleware(router, transformBoolToEmptyObject(options.cors));
    }

    await registerAssetsMiddleware(router);

    registerBasicMiddleware(router);

    if (isBuiltInMiddlewareEnabled(options.prometheus)) {
        registerPrometheusMiddleware(router, transformBoolToEmptyObject(options.prometheus));
    }

    if (isBuiltInMiddlewareEnabled(options.rateLimit)) {
        registerRateLimitMiddleware(router, transformBoolToEmptyObject(options.rateLimit));
    }

    if (isBuiltInMiddlewareEnabled(options.swagger)) {
        registerSwaggerMiddleware(router, {
            documentPath: path.join(resolvePackagePath(), 'dist', 'swagger.json'),
            options: {
                baseURL: options.publicURL,
                ...transformBoolToEmptyObject(options.swagger),
            },
        });
    }

    registerAuthorizationMiddleware(router);
}
