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
import type { CertificateSource } from '../../../adapters/http/request/index.ts';

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
     * Directory the application writes to at runtime (log files in
     * production) and reads file-based provisioning from
     * (`<writableDirectoryPath>/provisioning`).
     *
     * The SQLite database is NOT placed here - its path comes from the
     * database configuration (`db.database` / `DB_DATABASE`), resolved
     * against the process working directory by typeorm-extension.
     *
     * Relative or absolute path.
     * If the path is relative, the rootPath will be appended.
     *
     * default: writable
     */
    writableDirectoryPath: string,

    /**
     * EXPERIMENTAL. May change in a minor release: per-realm themes are
     * likely to reshape the directory into `<root>/<theme name>/`. The
     * manifest's `version` field makes a breaking change detectable.
     *
     * Directory holding the operator theme applied to the served consoles
     * (the auth console and the account console). Relative paths resolve
     * against the rootPath.
     *
     * The directory is operator trust, exactly like the config file: its
     * `assets/` sub-directory is served verbatim at `/theme`, and its
     * `theme.json` injects CSS custom properties into both consoles.
     * Mount it read-only and never from a source a tenant can write.
     *
     * default: '' (theming disabled)
     */
    themeDirectoryPath: string,

    /**
     * EXPERIMENTAL, alongside themeDirectoryPath.
     *
     * Opt in to reading `fragments/head.html` from the theme directory and
     * splicing it into the `<head>` of both served consoles.
     *
     * The fragment is raw, unsanitized markup running on the IdP origin,
     * so it must be a deliberate operator decision and never a consequence
     * of a file appearing in the mounted directory.
     *
     * default: false
     */
    themeFragmentsEnabled: boolean,

    /**
     * EXPERIMENTAL. The render contract it verifies is itself versioned
     * (CONTRACT_VERSION), but this key and the boot-time assert may change.
     *
     * Package directory of a substituted `@authup/client-auth-console`
     * (the directory holding its package.json and dist/). Consulted before
     * the node_modules resolution walk.
     *
     * This replaces the login/consent IMPLEMENTATION, not its styling: the
     * substituted package owns the prompt ladder, PKCE and state handling,
     * MFA ordering and redirect gating. Use the theme directory for
     * branding.
     *
     * default: '' (resolve @authup/client-auth-console from node_modules)
     */
    authConsolePath: string,

    /**
     * Package directory of a substituted
     * `@authup/client-account-console`. Same contract as authConsolePath.
     *
     * default: '' (resolve @authup/client-account-console from node_modules)
     */
    accountConsolePath: string,

    /**
     * Package directory of a substituted
     * `@authup/client-admin-console`. Same contract as accountConsolePath.
     *
     * default: '' (resolve @authup/client-admin-console from node_modules)
     */
    adminConsolePath: string,

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
     * Background components (the cron sweeps) run in this process. Set
     * false on API replicas when a dedicated worker process runs them.
     * default: true
     */
    componentsEnabled: boolean,

    /**
     * Apply pending schema migrations at startup. When false, startup runs
     * no DDL: it verifies no migrations are pending and fails loud
     * otherwise. The `migration` CLI command is unaffected. Ignored on
     * sqlite, which has no migrations and always synchronizes.
     * default: true
     */
    migrationEnabled: boolean,

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
     * Optional externally reachable base URL dedicated to endpoints that
     * request TLS client certificates. Published as RFC 8705 mTLS endpoint
     * aliases. The reverse proxy may route it to the same backend listener.
     * default: null
     */
    mtlsPublicUrl: string | null,

    /**
     * Trusted-proxy client-certificate header contract. Enabling a source
     * asserts that the backend listener is reachable only through a proxy that
     * removes or overwrites the selected headers.
     * default: disabled
     */
    certificateSource: CertificateSource,

    /**
     * Which upstream proxies to trust when deriving the client IP from
     * `X-Forwarded-For` (routup's `TrustProxyInput` minus the function
     * form): `true` trusts every hop, `false` trusts none (the socket
     * peer address is used), a number trusts that many hops, and a
     * string / string[] is a proxy-addr allowlist (IPs, CIDRs, or the
     * presets `loopback`, `linklocal`, `uniquelocal`; a comma-separated
     * string splits into a list).
     *
     * SECURITY: with `true`, any DIRECT client can spoof its IP via the
     * `X-Forwarded-For` header — login-throttle keys, audit-event rows,
     * and the session inventory all record the forged value. Pin the
     * actual proxy (`1`, `loopback`, or its address/CIDR) when the
     * listener is reachable without a proxy or exact attribution
     * matters.
     * default: true
     */
    trustProxy: boolean | number | string | string[],

    /**
     * Trusted first-party app origins (besides publicUrl) — used as
     * redirect targets for the per-realm public system clients. Does NOT
     * drive CORS (the API reflects any origin by default; an explicit
     * CORS allowlist goes through middlewareCors), and does not affect
     * UIs using their own registered OAuth2 client. Input entries may be
     * full http(s) origins (scheme://host[:port]; other protocols are
     * rejected) or bare hosts (host[:port]) — a bare host expands to
     * both its http and https origin during normalization, so the
     * normalized config always holds full origins (scheme://host[:port],
     * no path); each is stored as `<origin>/**` in the system clients'
     * redirect_uri set.
     *
     * SECURITY: the system clients are built_in (auto-consent + `global`
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

    /**
     * Serve the account self-service surface (`/console/account`: profile,
     * password, authenticators, sessions, applications). Operators with their
     * own self-service portal can disable authup's.
     * default: true
     */
    accountConsoleEnabled: boolean,

    /**
     * Serve the admin console at `<publicUrl>/console/admin`. Off, the route
     * answers with the disabled notice; a standalone-hosted console is
     * unaffected.
     * default: true
     */
    adminConsoleEnabled: boolean,

    // ----------------------------------------------------

    /**
     * Persist security audit events (login, authorize, replay detection, ...)
     * to the auth_events table. When disabled only the structured log line
     * is emitted.
     * default: true
     */
    eventLogEnabled: boolean,

    /**
     * Per-row retention for persisted audit events in days (stamped as
     * expires_at at write time, swept by the event cleaner). Raise it for
     * longer compliance windows; 0 = keep forever.
     * default: 90
     */
    eventLogRetentionDays: number,

    /**
     * Additionally mirror every entity create/update/delete published on the
     * domain-event bus into the auth_events table (scope: entity). Only
     * effective while eventLogEnabled is true.
     * default: true
     */
    eventLogEntityEnabled: boolean,

    /**
     * Per-row retention for entity-CRUD audit events in days — deliberately
     * short so entity churn self-prunes. 0 = keep forever.
     * default: 7
     */
    eventLogEntityRetentionDays: number,

    /**
     * Throttle failed interactive logins per (identifier, ip) pair by
     * counting recent loginFailed audit events. Requires eventLogEnabled.
     * default: false
     */
    loginAttemptThrottleEnabled: boolean,

    /**
     * Failed attempts per (identifier, ip) pair within the window before
     * the pair is throttled.
     * default: 5
     */
    loginAttemptThreshold: number,

    /**
     * Sliding throttle window in seconds.
     * default: 900
     */
    loginAttemptWindow: number,

    // ----------------------------------------------------

    /**
     * Optional base64-encoded 32-byte KEK (AES-256-GCM) wrapping the realm
     * key store's material at rest (auth_keys.decryption_key — realm
     * signing private keys and the per-realm enc keys the MFA seed cipher
     * rides). Unset = material persists unwrapped (Keycloak/authentik
     * parity); setting it later wraps rows lazily on read, removing it
     * while wrapped rows exist fails loud at first use.
     * default: '' (unset)
     */
    secretsEncryptionKey: string,

    /**
     * Org-wide multi-factor authentication feature toggle. When enabled,
     * users can enroll authenticator devices, and a user holding a
     * confirmed device must present a second factor on interactive
     * authorization and the password grant.
     * default: false
     */
    mfaEnabled: boolean,

    /**
     * Enforce MFA for every user: a user without a confirmed device is
     * routed to inline enrollment at next interactive login
     * (configure-inline). Requires mfaEnabled.
     * default: false
     */
    mfaRequired: boolean,

    /**
     * Max age (seconds) of the session's second-factor proof (mfa_at) an
     * `acr_values=urn:authup:mfa` step-up request accepts before forcing
     * a fresh challenge. Mirrors promptLoginMaxAge's semantics (the
     * window absorbs the hosted challenge round-trip).
     * default: 60
     */
    mfaFreshnessMaxAge: number,

    /**
     * Lifetime (seconds) of the "MFA-pending" login ticket the password
     * grant issues when the second factor cannot ride the single POST
     * (email / WebAuthn) — and of the pending session backing it (extended
     * to the full session lifetime on completion). Sized to cover the
     * email-OTP window (code expiry: 10 minutes).
     * default: 600
     */
    mfaTicketMaxAge: number,

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
