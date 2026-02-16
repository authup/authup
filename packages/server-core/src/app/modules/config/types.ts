/*
 * Copyright (c) 2022-2025.
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
import type { BetterSqlite3ConnectionOptions } from 'typeorm/driver/better-sqlite3/BetterSqlite3ConnectionOptions.js';
import type { MysqlConnectionOptions } from 'typeorm/driver/mysql/MysqlConnectionOptions.js';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions.js';
import type { SMTPOptions } from '../mail/adapter/smtp/types.ts';

export type Config = {
    /**
     * Application environment (e.g., 'production').
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
     * Application port number.
     * default: 3001
     */
    port: number,

    /**
     * Application host.
     * default: localhost
     */
    host: string,

    /**
     * API base URL.
     * default: http://localhost:3001
     */
    publicUrl: string,

    /**
     * Domain for setting cookies after authorization.
     * default: undefined
     *
     * @deprecated
     */
    cookieDomain?: string,

    // ----------------------------------------------------

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

    // ----------------------------------------------------

    /**
     * Refresh token validity in seconds (default: 259,200s / 3 days).
     * default: 259_200s (3days)
     */
    tokenRefreshMaxAge: number,

    /**
     * Access token validity in seconds (default: 3600s / 1 hour).
     * default: 3_600s (1h)
     */
    tokenAccessMaxAge: number,

    // ----------------------------------------------------

    /**
     * Enable user registration?
     * default: false
     */
    registration: boolean,

    /**
     * Require email verification for registration or login?
     * default: false
     */
    emailVerification: boolean,

    /**
     * Allow password reset via email?
     * default: false
     */
    forgotPassword: boolean,

    // ----------------------------------------------------

    /**
     * default: false
     */
    clientAuthBasic: boolean,

    /**
     * Enable a client account for the default realm.
     * default: false
     */
    clientSystemEnabled: boolean,

    /**
     * The secret of the default client.
     */
    clientSystemSecret: string,

    /**
     * Reset client secret on application startup.
     * default: undefined
     */
    clientSystemSecretReset: boolean,

    // ----------------------------------------------------

    /**
     * default: false
     */
    userAuthBasic: boolean,

    /**
     * Enable default admin user.
     * default: true
     */
    userAdminEnabled: boolean,

    /**
     * The password of the default admin user.
     * default: 'start123'
     */
    userAdminPassword: string,

    /**
     * Reset admin password on application startup.
     * default: undefined
     */
    userAdminPasswordReset: boolean,

    // ----------------------------------------------------

    /**
     * default: false
     */
    robotAuthBasic: boolean,

    /**
     * Enable a global robot account.
     * default: false
     */
    robotAdminEnabled: boolean,

    /**
     * The secret of the default admin user.
     * default: (**generated**)
     */
    robotAdminSecret: string,

    /**
     * Reset the robot secret on application startup.
     * default: false
     */
    robotAdminSecretReset: boolean,

    // ----------------------------------------------------

    /**
     * default: []
     */
    permissions: string | string[],
};

export type ConfigInput = Partial<Config>;
