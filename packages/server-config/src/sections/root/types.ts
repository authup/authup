/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * The database connection, as the CONFIGURATION document models it.
 *
 * Deliberately authup's own type rather than typeorm's `DataSourceOptions`.
 * The document is read by every server package, and a static file server must
 * not install typeorm to know that a `db` key exists. The runtime check behind
 * this key is `isObject` and stays that permissive, so the published JSON
 * Schema already says "any object" either way: the precise driver union bought
 * nothing at the configuration surface, and the handful of internal call sites
 * that hand the value to typeorm narrow it there.
 *
 * The index signature is what keeps that promise: every typeorm option an
 * operator could pass before still passes through untouched.
 */
export type DatabaseConnectionOptions = {
    type: 'mysql' | 'postgres' | 'better-sqlite3',
    host?: string,
    port?: number,
    username?: string,
    password?: string,
    database?: string,
    url?: string,
    [key: string]: any,
};

/**
 * The redis connection: a connection URL, a boolean, or an options object.
 *
 * The object arm is deliberately opaque for the same reason `db` is: typing it
 * against `@authup/server-kit`'s client options would put redis, winston and
 * native crypto bindings behind every reader of this document. An already
 * constructed client is still accepted at runtime (the zod type is
 * `isObject`), which is what a programmatic embedder passes.
 */
export type RedisConnectionOptions = string | boolean | Record<string, any>;

/**
 * The outgoing-mail transport: a connection URL, a boolean, or transport
 * options. Opaque here for the same reason as `db` and `redis`; server-core's
 * mail module owns the precise shape.
 */
export type SMTPConnectionOptions = string | boolean | Record<string, any>;

/**
 * The deployment-wide section: the keys at the ROOT of `authup.yml`, which
 * describe the deployment rather than any one service, and which every service
 * in it therefore agrees on.
 */
export type RootConfig = {
    /**
     * The bind address every listener of the deployment falls back to.
     *
     * Read by nobody directly: each listener's own `host` key reaches it
     * through its fallback chain, so setting it once configures server-core
     * and all three console services.
     */
    defaultHost: string,

    /**
     * Application environment (e.g. 'production').
     * default: 'development'
     */
    env: string,

    /**
     * Root directory every relative path key resolves against.
     * default: process.cwd()
     */
    rootPath: string,

    /**
     * Externally reachable base URL of the API, and the OIDC issuer.
     *
     * Read by every console as the address it talks to, and derived by
     * server-core from its host and port when the document names none. A
     * console has no host and port of the API's to derive it from, so whoever
     * composes the deployment hands its resolved value over.
     *
     * default: derived, http://<host>:<port>
     */
    publicUrl: string,

    /**
     * Trusted first-party app origins (besides publicUrl), used as redirect
     * targets for the per-realm public system clients. Does NOT drive CORS
     * (the API reflects any origin by default; an explicit CORS allowlist goes
     * through middlewareCors), and does not affect UIs using their own
     * registered OAuth2 client. Input entries may be full http(s) origins
     * (scheme://host[:port]; other protocols are rejected) or bare hosts
     * (host[:port]) - a bare host expands to both its http and https origin
     * during normalization, so the normalized config always holds full origins
     * (no path); each is stored as `<origin>/**` in the system clients'
     * redirect_uri set.
     *
     * Also read by the account console as the allowlist its `ref` back link is
     * validated against.
     *
     * SECURITY: the system clients are built_in (auto-consent + `global`
     * scope), so any origin listed here can obtain a full-permission user
     * token once a user logs in. Adding an origin grants it full login
     * capability for every realm.
     *
     * default: []
     */
    trustedOrigins: string[],

    /**
     * Database connection. Without one, and outside production, the
     * better-sqlite3 driver default applies.
     */
    db?: DatabaseConnectionOptions,

    /**
     * default: false
     */
    redis: RedisConnectionOptions,

    /**
     * default: false
     */
    smtp: SMTPConnectionOptions,
};
