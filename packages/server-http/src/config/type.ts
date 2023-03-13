/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Options as BodyOptions } from '@routup/body';
import type { ParseOptions as CookieOptions } from '@routup/cookie';
import type { OptionsInput as PrometheusOptions } from '@routup/prometheus';
import type { ParseOptions as QueryOptions } from '@routup/query';
import type { OptionsInput as RateLimitOptions } from '@routup/rate-limit';
import type { UIOptions as SwaggerUIOptions } from '@routup/swagger';
import type { CorsOptions } from 'cors';

export type Options = {
    /**
     * default: process.cwd()
     */
    rootPath: string,
    /**
     * Relative/absolute path to the writable directory.
     * default: path.join(process.cwd(), 'writable')
     */
    writableDirectoryPath: string,
    /**
     * default: 'development'
     */
    env: string,

    /**
     * default: 3010
     */
    port: number,

    /**
     * default: 0.0.0.0
     */
    host: string,

    /**
     * default: http://127.0.0.1:3010
     */
    publicUrl: string,
    /**
     * default: http://127.0.0.1:3000
     */
    authorizeRedirectUrl: string,

    /**
     * use body middleware
     *
     * default: true
     */
    middlewareBody: boolean | BodyOptions,
    /**
     * use cors middleware
     *
     * default: true
     */
    middlewareCors: boolean | CorsOptions,
    /**
     * use cookie middleware
     *
     * default: true
     */
    middlewareCookie: boolean | CookieOptions,
    /**
     * Prometheus middleware (options)
     */
    middlewarePrometheus: boolean | PrometheusOptions,

    /**
     * Query middleware (options)
     */
    middlewareQuery: boolean | QueryOptions,
    /**
     * Rate limit middleware (options).
     */
    middlewareRateLimit: boolean | RateLimitOptions,
    /**
     * Swagger middleware (options)
     *
     * default: true
     */
    middlewareSwagger: boolean | SwaggerUIOptions,

    /**
     * default: 3600
     */
    tokenMaxAgeAccessToken: number,

    /**
     * default: 3600
     */
    tokenMaxAgeRefreshToken: number,

    /**
     * Enable registration.
     *
     * default: false
     */
    registration: boolean,

    /**
     * Email verification required for registration or login with identity provider.
     *
     * default: false
     */
    emailVerification: boolean,

    /**
     * Allow password reset?
     *
     * default: false
     */
    forgotPassword: boolean
};

export type OptionsInput = Partial<Options>;
