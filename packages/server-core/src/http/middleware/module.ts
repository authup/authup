/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import type { Router } from 'routup';
import { useConfig } from '../../config';
import {
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

export function registerMiddlewares(router: Router) {
    const config = useConfig();

    registerLoggerMiddleware(router);

    const cors = config.middlewareCors;
    if (isBuiltInMiddlewareEnabled(cors)) {
        registerCorsMiddleware(router, transformBoolToEmptyObject(cors));
    }

    registerBasicMiddleware(router);

    const prometheus = config.middlewarePrometheus;
    if (isBuiltInMiddlewareEnabled(prometheus)) {
        registerPrometheusMiddleware(router, transformBoolToEmptyObject(prometheus));
    }

    const rateLimit = config.middlewareRateLimit;
    if (isBuiltInMiddlewareEnabled(rateLimit)) {
        registerRateLimitMiddleware(router, transformBoolToEmptyObject(rateLimit));
    }

    const swagger = config.middlewareSwagger;
    if (isBuiltInMiddlewareEnabled(swagger)) {
        registerSwaggerMiddleware(router, {
            documentPath: path.join(config.writableDirectoryPath, 'swagger.json'),
            options: {
                baseURL: config.publicUrl,
                ...transformBoolToEmptyObject(swagger),
            },
        });
    }

    registerAuthorizationMiddleware(router);
}
