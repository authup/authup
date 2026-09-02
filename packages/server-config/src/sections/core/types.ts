/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { CERTIFICATE_SOURCES } from './constants.ts';

export type CertificateSource = typeof CERTIFICATE_SOURCES[number];

/**
 * A routup middleware: on, off, or its options.
 *
 * The options arm is deliberately opaque. Typing each `middleware*` key
 * against its own `@routup/*` package would put six of them behind every
 * reader of this document, a static file server included, and the runtime
 * check is a boolean-or-object either way, so the published JSON Schema says
 * exactly this. The modules that mount a middleware narrow the value where
 * they hand it over.
 */
export type MiddlewareOptions = boolean | Record<string, any>;

/**
 * The `core.*` section: the keys the API and IdP service reads.
 */
export type CoreWorkerConfig = {
    /**
     * Run the worker in this process. Under the default mode the API runs it
     * alongside itself; set false on API replicas when a dedicated
     * `authup start worker` process runs it. Worker mode refuses to
     * start when this is false.
     * default: true
     */
    enabled: boolean,
};

export type CoreConfig = {
    /**
     * Directory the application writes to at runtime (log files in
     * production) and reads file-based provisioning from
     * (`<writableDirectoryPath>/provisioning`).
     *
     * The SQLite database is NOT placed here - its path comes from the
     * database configuration (`db.database` / `DB_DATABASE`), resolved
     * against the process working directory by typeorm-extension.
     *
     * Relative or absolute path. If the path is relative, the rootPath will be
     * appended.
     *
     * default: writable
     */
    writableDirectoryPath: string,

    // ----------------------------------------------------

    /**
     * default: true
     */
    logger: boolean,

    // ----------------------------------------------------

    /**
     * The worker: the background cron sweeps.
     */
    worker: CoreWorkerConfig,

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
     * default: 0.0.0.0
     */
    host: string,

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
     * `X-Forwarded-For` header. Login-throttle keys, audit-event rows,
     * and the session inventory all record the forged value. Pin the
     * actual proxy (`1`, `loopback`, or its address/CIDR) when the
     * listener is reachable without a proxy or exact attribution
     * matters.
     * default: true
     */
    trustProxy: boolean | number | string | string[],

    // ----------------------------------------------------

    /**
     * use body middleware
     *
     * default: true
     */
    middlewareBody: MiddlewareOptions,

    /**
     * use cors middleware
     *
     * default: true
     */
    middlewareCors: MiddlewareOptions,

    /**
     * use cookie middleware
     *
     * default: true
     */
    middlewareCookie: MiddlewareOptions,

    /**
     * Prometheus middleware (options)
     */
    middlewarePrometheus: MiddlewareOptions,

    /**
     * Query middleware (options)
     */
    middlewareQuery: MiddlewareOptions,

    /**
     * Rate limit middleware (options).
     */
    middlewareRateLimit: MiddlewareOptions,

    /**
     * Swagger middleware. The zod type behind this key is a plain boolean, so
     * options are typed but not accepted; the wider type is what every other
     * middleware key carries.
     *
     * default: true
     */
    middlewareSwagger: MiddlewareOptions,

    // ----------------------------------------------------

    /**
     * Refresh token validity in seconds.
     * default: 259_200s (3 days)
     */
    tokenRefreshMaxAge: number,

    /**
     * Access token validity in seconds.
     * default: 900s (15min)
     */
    tokenAccessMaxAge: number,

    /**
     * Grace period (seconds) during which a just-rotated (consumed) refresh
     * token is still accepted, minting new chain-linked tokens instead of
     * triggering replay detection. Absorbs multi-tab / mobile refresh races.
     * default: 0 (strict, first-use-wins)
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
     * default: 0 (unbounded, spec/Keycloak parity)
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
     * Per-row retention for entity-CRUD audit events in days, deliberately
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
     * key store's material at rest (auth_keys.decryption_key: realm
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
     * (email / WebAuthn), and of the pending session backing it (extended
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
     * default: false
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
     * default: false
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
