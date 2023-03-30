/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ParseOptions as CookieOptions } from '@routup/cookie/dist/type';
import type { OptionsInput as PrometheusOptions } from '@routup/prometheus/dist/type';
import type { ParseOptions as QueryOptions } from '@routup/query/dist/type';
import type { OptionsInput as RateLimitOptions } from '@routup/rate-limit/dist/type';
import type { UIOptions as SwaggerUIOptions } from '@routup/swagger/dist/ui/type';
import type { Options as BodyOptions } from 'body-parser';
import type { Continu } from 'continu';
import type { CorsOptions } from 'cors';
import type { Client, ClientOptions } from 'redis-extension';
import type { SmtpConfig } from '@authup/server-common';

export type Options = {
    /**
     * default: 'development'
     */
    env: string,

    /**
     * default: process.cwd()
     */
    rootPath: string,
    /**
     * Relative or absolute path.
     * If the path is relative, the rootPath will be appended.
     *
     * default: writable
     */
    writableDirectoryPath: string,

    // ----------------------------------------------------

    /**
     * default: true
     */
    redis: string | boolean | Client | ClientOptions,

    /**
     * default: false
     */
    vault: string | boolean,

    /**
     * default: false
     */
    smtp: string | boolean | SmtpConfig,

    // ----------------------------------------------------

    /**
     * default: 3001
     */
    port: number,

    /**
     * default: 0.0.0.0
     */
    host: string,

    /**
     * default: http://127.0.0.1:3001
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

    // ----------------------------------------------------

    /**
     * default: 'admin'
     */
    adminUsername: string,
    /**
     * default: 'start123'
     */
    adminPassword: string,
    /**
     * default: undefined
     */
    adminPasswordReset?: boolean,
    /**
     * default: false
     */
    robotEnabled: boolean,
    /**
     * default: undefined
     */
    robotSecret?: string,
    /**
     * default: undefined
     */
    robotSecretReset?: boolean,
    /**
     * default: []
     */
    permissions: string[],

    // ----------------------------------------------------

};

export type OptionsInput = Omit<Partial<Options>, 'permissions'> & {
    /**
     * default: []
     */
    permissions?: string[] | string
};

export type Config = Continu<Options, OptionsInput>;
