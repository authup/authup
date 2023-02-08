/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import { Router } from 'routup';
import { useConfig } from '../config';
import {
    registerAuthMiddleware,
    registerBodyMiddleware,
    registerCookieMiddleware,
    registerCorsMiddleware,
    registerLoggerMiddleware,
    registerPrometheusMiddleware,
    registerQueryMiddleware,
    registerRateLimitMiddleware,
    registerSwaggerMiddleware,
} from './built-in';
import {
    isBuiltInMiddlewareEnabled,
    transformBoolToEmptyObject,
} from './utils';

export function registerMiddlewares(router: Router) {
    const config = useConfig();

    registerLoggerMiddleware(router);

    const cors = config.get('middlewareCors');
    if (isBuiltInMiddlewareEnabled(cors)) {
        registerCorsMiddleware(router, transformBoolToEmptyObject(cors));
    }

    const body = config.get('middlewareBody');
    if (isBuiltInMiddlewareEnabled(body)) {
        registerBodyMiddleware(router, transformBoolToEmptyObject(body));
    }

    const cookie = config.get('middlewareCookie');
    if (isBuiltInMiddlewareEnabled(cookie)) {
        registerCookieMiddleware(router, transformBoolToEmptyObject(cookie));
    }

    const prometheus = config.get('middlewarePrometheus');
    if (isBuiltInMiddlewareEnabled(prometheus)) {
        registerPrometheusMiddleware(router, transformBoolToEmptyObject(prometheus));
    }

    const query = config.get('middlewareQuery');
    if (isBuiltInMiddlewareEnabled(query)) {
        registerQueryMiddleware(router, transformBoolToEmptyObject(query));
    }

    const rateLimit = config.get('middlewareRateLimit');
    if (isBuiltInMiddlewareEnabled(rateLimit)) {
        registerRateLimitMiddleware(router, transformBoolToEmptyObject(rateLimit));
    }

    const swagger = config.get('middlewareSwagger');
    if (isBuiltInMiddlewareEnabled(swagger)) {
        registerSwaggerMiddleware(router, {
            documentPath: path.join(config.get('writableDirectoryPath'), 'swagger.json'),
        });
    }

    registerAuthMiddleware(router);
}
