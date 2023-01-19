/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { REALM_MASTER_NAME, ROBOT_SYSTEM_NAME } from '@authup/common';
import {
    Request, Router, useRequestPath, withLeadingSlash,
} from 'routup';
import {
    Options as BodyOptions,
    createRequestJsonHandler, createRequestUrlEncodedHandler,
} from '@routup/body';
import {
    ParseOptions as CookieOptions,
    createRequestHandler as createRequestCookieHandler,
} from '@routup/cookie';
import {
    OptionsInput as PrometheusOptions,
    createHandler as createPrometheusHandler,
    registerMetrics,
} from '@routup/prometheus';
import {
    ParseOptions as QueryOptions,
    createRequestHandler as createRequestQueryHandler,
} from '@routup/query';
import {
    OptionsInput as RateLimitOptions,
    createHandler as createRateLimitHandler,
} from '@routup/rate-limit';
import { createUIHandler } from '@routup/swagger';
import path from 'path';
import fs from 'fs';
import { useLogger } from '@authup/server-common';
import { merge } from 'smob';
import {
    useConfig,
} from '../config';
import { useRequestEnv } from '../utils';
import { createLoggerMiddleware } from './logger';
import { createMiddleware } from './core';

export function registerMiddlewares(
    router: Router,
) {
    const config = useConfig();

    router.use(createLoggerMiddleware());

    const middlewareBody = config.get('middlewareBody');
    if (middlewareBody) {
        let options : BodyOptions = {};
        if (typeof middlewareBody !== 'boolean') {
            options = middlewareBody;
        }

        router.use(createRequestJsonHandler(options));
        router.use(createRequestUrlEncodedHandler({ extended: false, ...options }));
    }

    // only register middleware, if options are set.
    // otherwise parse cookies on demand
    const middlewareCookie = config.get('middlewareCookie');
    if (middlewareCookie) {
        let options : CookieOptions = {};
        if (typeof middlewareCookie !== 'boolean') {
            options = middlewareCookie;
        }

        router.use(createRequestCookieHandler(options));
    }

    const middlewarePrometheus = config.get('middlewarePrometheus');
    if (middlewarePrometheus) {
        let options : PrometheusOptions = {
            skip(req) {
                const path = withLeadingSlash(useRequestPath(req));

                return path.startsWith('/authorize');
            },
        };
        if (typeof middlewarePrometheus !== 'boolean') {
            options = merge(options, middlewarePrometheus);
        }

        registerMetrics(router, options);

        router.get('/metrics', createPrometheusHandler(options.registry));
    }

    // only register middleware, if options are set.
    // otherwise parse query on demand
    const queryMiddleware = config.get('middlewareQuery');
    if (queryMiddleware) {
        let options : QueryOptions = {};
        if (typeof queryMiddleware !== 'boolean') {
            options = queryMiddleware;
        }

        router.use(createRequestQueryHandler(options));
    }

    const rateLimitMiddleware = config.get('middlewareRateLimit');
    if (rateLimitMiddleware) {
        let options : RateLimitOptions = {
            skip(req: Request) {
                const robot = useRequestEnv(req, 'robot');
                if (robot) {
                    const { name } = useRequestEnv(req, 'realm');

                    if (
                        name === REALM_MASTER_NAME &&
                        robot.name === ROBOT_SYSTEM_NAME
                    ) {
                        return true;
                    }
                }

                return false;
            },
            max(req: Request) {
                if (useRequestEnv(req, 'userId')) {
                    return 60 * 10; // 10 req p. sec
                }

                const robot = useRequestEnv(req, 'robot');
                if (robot) {
                    return 60 * 100; // 100 req p. sec
                }

                return 60 * 0.5; // 1/2 req p. sec
            },
            windowMs: 60 * 1000, // 60 sec
        };

        if (typeof rateLimitMiddleware !== 'boolean') {
            options = merge(options, rateLimitMiddleware);
        }

        router.use(createRateLimitHandler(options));
    }

    //--------------------------------------------------------------------

    router.use(createMiddleware());

    //--------------------------------------------------------------------

    const middlewareSwagger = config.get('middlewareSwagger');
    if (middlewareSwagger) {
        const swaggerDocumentPath: string = path.join(config.get('writableDirectoryPath'), 'swagger.json');

        if (fs.existsSync(swaggerDocumentPath)) {
            const swaggerDocument = fs.readFileSync(swaggerDocumentPath, { encoding: 'utf-8' });

            router.use('/docs', createUIHandler(JSON.parse(swaggerDocument)));
        } else {
            useLogger().warn(`Swagger file ( ${swaggerDocumentPath} ) does not exist.`);
        }
    }
}
