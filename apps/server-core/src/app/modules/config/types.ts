/*
 * Copyright (c) 2022-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { RedisClient, RedisClientOptions } from '@authup/server-kit';
import type { ParseOptions as CookieOptions } from '@routup/basic/cookie';
import type { Options as CorsOptions } from '@routup/cors';
import type { OptionsInput as PrometheusOptions } from '@routup/prometheus';
import type { ParseOptions as QueryOptions } from '@routup/basic/query';
import type { OptionsInput as RateLimitOptions } from '@routup/rate-limit';
import type { UIOptions as SwaggerUIOptions } from '@routup/swagger-ui';
import type { Options as BodyOptions } from '@routup/basic/body';
import type { DataSourceOptions } from 'typeorm';
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
    db?: DataSourceOptions,

    /**
     * default: true
     */
    redis: string | boolean | RedisClient | RedisClientOptions,

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
     * Trusted first-party app origins (besides publicUrl) — used as
     * redirect targets for the per-realm public `web` client. Does NOT
     * drive CORS (the API reflects any origin by default; an explicit
     * CORS allowlist goes through middlewareCors), and does not affect
     * UIs using their own registered OAuth2 client. Input entries may be
     * full http(s) origins (scheme://host[:port]; other protocols are
     * rejected) or bare hosts (host[:port]) — a bare host expands to
     * both its http and https origin during normalization, so the
     * normalized config always holds full origins (scheme://host[:port],
     * no path); each is stored as `<origin>/**` in the web client's
     * redirect_uri set.
     *
     * SECURITY: the `web` client is built_in (auto-consent + `global`
     * scope), so any origin listed here can obtain a full-permission user
     * token once a user logs in. Adding an origin grants it full login
     * capability for every realm.
     *
     * default: []
     */
    trustedOrigins: string[],

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
     * Access token validity in seconds (default: 900s / 15 minutes).
     * default: 900s (15min)
     */
    tokenAccessMaxAge: number,

    /**
     * Grace period (seconds) during which a just-rotated (consumed) refresh
     * token is still accepted, minting new chain-linked tokens instead of
     * triggering replay detection. Absorbs multi-tab / mobile refresh races.
     * default: 0 (strict — first-use-wins)
     */
    tokenRefreshGracePeriod: number,

    /**
     * Max age (seconds) of the authentication that a `prompt=login` / `max_age`
     * authorize request accepts before forcing re-authentication. A stateless
     * approximation judged against the session's created_at.
     * default: 60s
     */
    promptLoginMaxAge: number,

    /**
     * Seconds past its `exp` an (expired) `id_token_hint` presented at the
     * RP-initiated logout endpoint (`/logout`) is still accepted for a
     * server-side session revoke. Bounds how long a leaked id_token stays a
     * replayable remote logout; beyond the window the click-gated confirm
     * page still works.
     * default: 0 (unbounded — spec/Keycloak parity)
     */
    endSessionHintGracePeriod: number,

    // ----------------------------------------------------

    /**
     * Enable user registration?
     * default: false
     */
    registrationEnabled: boolean,

    /**
     * Require email verification for registration or login?
     * default: false
     */
    emailVerificationEnabled: boolean,

    /**
     * Allow password reset via email?
     * default: false
     */
    passwordRecoveryEnabled: boolean,

    /**
     * Minimum length for user-chosen passwords (user create/update,
     * registration, password reset). The maximum is fixed at 512.
     * default: 10
     */
    passwordMinLength: number,

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

    /**
     * Auto-assign system.default policy to new permissions without policies.
     * Creates an entry in the permission-policy junction table.
     * default: true
     *
     * @deprecated Will be removed in v2.0.0. External systems should assign policies explicitly.
     */
    permissionsDefaultPolicyAssignment: boolean,
};

export type ConfigInput = Partial<Config>;

export type ConfigFactory = () => Promise<Config> | Config;
