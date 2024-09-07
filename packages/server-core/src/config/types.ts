/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { RedisClient, RedisClientOptions } from '@authup/server-kit';
import type { ParseOptions as CookieOptions } from '@routup/basic/cookie';
import type { OptionsInput as PrometheusOptions } from '@routup/prometheus';
import type { ParseOptions as QueryOptions } from '@routup/basic/query';
import type { OptionsInput as RateLimitOptions } from '@routup/rate-limit';
import type { UIOptions as SwaggerUIOptions } from '@routup/swagger';
import type { Options as BodyOptions } from '@routup/basic/body';
import type { CorsOptions } from 'cors';
import type { BetterSqlite3ConnectionOptions } from 'typeorm/driver/better-sqlite3/BetterSqlite3ConnectionOptions';
import type { MysqlConnectionOptions } from 'typeorm/driver/mysql/MysqlConnectionOptions';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import type { SMTPOptions } from '../core';

export type Config = {
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
    logger: boolean;

    /**
     * default driver: better-sqlite3
     */
    db: MysqlConnectionOptions |
    PostgresConnectionOptions |
    BetterSqlite3ConnectionOptions,

    /**
     * default: true
     */
    redis: string | boolean | RedisClient | RedisClientOptions,

    /**
     * default: false
     */
    vault: string | boolean,

    /**
     * default: false
     */
    smtp: string | boolean | SMTPOptions,

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
     * default: undefined
     */
    cookieDomain?: string,

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
     * default: 259.200s (3d)
     */
    tokenRefreshMaxAge: number,

    /**
     * default: 3.600s (1h)
     */
    tokenAccessMaxAge: number,

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
     * Allow password reset via email?
     *
     * default: false
     */
    forgotPassword: boolean,

    // ----------------------------------------------------

    /**
     * default: false
     */
    clientAuthBasic: boolean,

    // ----------------------------------------------------

    /**
     * default: false
     */
    userAuthBasic: boolean,
    /**
     * default: true
     */
    userAdminEnabled: boolean,
    /**
     * default: 'admin'
     */
    userAdminName: string,
    /**
     * default: 'start123'
     */
    userAdminPassword: string,
    /**
     * default: undefined
     */
    userAdminPasswordReset?: boolean,

    // ----------------------------------------------------

    /**
     * default: false
     */
    robotAuthBasic: boolean,
    /**
     * default: false
     */
    robotAdminEnabled: boolean,
    /**
     * default: system
     */
    robotAdminName?: string,
    /**
     * default: undefined
     */
    robotAdminSecret?: string,
    /**
     * default: undefined
     */
    robotAdminSecretReset?: boolean,

    // ----------------------------------------------------

    /**
     * default: []
     */
    permissions: string | string[],
};

export type ConfigInput = Partial<Config>;
