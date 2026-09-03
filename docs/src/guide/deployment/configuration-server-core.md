# Configuration

The API configuration is read from the `core` section of `authup.yml` (or of
`authup.{json,js,ts,...}`; see the [configuration introduction](./configuration) for
the file lookup and the `--configDirectory`/`--configFile` CLI flags).

Most options can also be provided as environment variables (shown in the `.env` tab below).
**An environment variable always overrides the file value** for the same option.
A few options are file-only and have no environment variable — they are marked as such.

Not every option below sits under `core`. `env`, `host`, `rootPath`,
`publicUrl` and `trustedOrigins` are top-level, the two theme options are
`theme.directoryPath` and `theme.fragmentsEnabled`, and the console options are
`adminConsole.*`, `accountConsole.*` and `authConsole.*`. The
`authup.yml` tab shows each one at its place.

`host` appears at both levels on purpose, and they are not alternatives. The
top-level one (env `HOST`) is the deployment-wide bind address every listener
inherits, so one line binds the API and all three console services; `core.host`
overrides it for the API listener alone and is what the sample below sets.
`port` has no top-level counterpart, because several listeners cannot share one.

Of those, server-core itself reads only `enabled` and `url` per console: `enabled`
gates the console's two sign-in routes, `url` is where it sends the browser. The rest
of a console's section, and the whole `theme` section, are read by the **console
service** that serves the console, so setting them on an API-only process
(`authup start core`) does nothing. See [Console Replicas](./console-replicas.md) for the
full per-console option list.

::: danger Security
The admin password and the `system` client secret both default to `start123`.
Set your own values (`userAdminPassword` / `clientSystemSecret`, or the
`USER_ADMIN_PASSWORD` / `CLIENT_SYSTEM_SECRET` environment variables) before
deploying to production — the examples below carry placeholders, never copy a
credential out of documentation.
:::

For MFA enforcement behavior and its federated-login, password-grant, feature-toggle,
and cache-availability boundaries, see [Multi-factor authentication](./configuration-server-core-mfa.md).

The infrastructure connections are documented on their own pages:
[Database](./configuration-server-core-database) (`db`),
[Redis](./configuration-server-core-redis) (`redis`) and
[SMTP](./configuration-server-core-smtp) (`smtp`).

::: code-group

```typescript [authup.ts]

export default {
    /**
     * Application environment (e.g., 'production').
     * env: NODE_ENV
     * default: development
     */
    env: 'production',

    /**
     * Base path for resolving relative paths (e.g. a relative
     * logDirectoryPath). File-only (no environment variable).
     * default: process working directory
     */
    rootPath: '/opt/authup',

    /**
     * API base URL.
     * May include a path prefix (e.g. https://example.com/auth) when the
     * server runs behind a reverse proxy that strips the prefix. Asset
     * URLs and links of the served consoles are rebased onto it
     * automatically.
     * env: PUBLIC_URL
     * default: derived from host & port — http://localhost:3000
     * (a wildcard bind address renders as localhost)
     */
    publicUrl: 'http://localhost:3000',

    /**
     * Additional trusted origins. Entries are http(s) origins
     * (e.g. https://app.example.com; other protocols are rejected) or
     * bare hosts (e.g. hub.local, hub.local:8080); a bare host expands
     * to both its http and https origin — pass a full origin to
     * restrict to one scheme.
     * Each origin is added to the redirect-URI allowlist of the per-realm
     * public system clients (as `<origin>/**`).
     * The origin of `publicUrl` is always trusted implicitly.
     * A host may carry a `*` (e.g. https://*.example.com), which matches
     * any host ending in `.example.com`. The wildcard never crosses a `/`,
     * so it cannot reach past the host, and a non-default port has to be
     * written out (https://*.example.com:8443).
     *
     * Security: the system clients are built-in with global scope, so any
     * allowlisted origin can complete a login and obtain a full-permission
     * token — only add origins you control. A wildcard host trusts every
     * subdomain, so use one only where you control the whole domain.
     * The consoles authup serves need no entry: they are on the
     * publicUrl origin. In non-production, a console's standalone vite dev
     * server origin (http://localhost:5173) is seeded automatically.
     * env: TRUSTED_ORIGINS (comma-separated)
     * default: []
     */
    trustedOrigins: ['https://app.example.com'],

    theme: {
        /**
         * EXPERIMENTAL (may change in a minor release; see the Theming guide).
         * Directory holding the operator theme applied to the served consoles.
         * Read by the console services, not by server-core: in a split
         * deployment it must be mounted into the console containers.
         * Relative paths are resolved against rootPath. Empty disables theming.
         * See the Theming guide.
         * env: THEME_DIRECTORY_PATH
         * default: '' (disabled)
         */
        directoryPath: '/etc/authup/theme',

        /**
         * EXPERIMENTAL, alongside directoryPath.
         * Read fragments/head.html from the theme directory and splice it
         * into the head of every served console. Raw, unsanitized markup on
         * the identity provider origin, so it is opt-in.
         * env: THEME_FRAGMENTS_ENABLED
         * default: false
         */
        fragmentsEnabled: false,
    },

    adminConsole: {
        /**
         * Where the admin console is published. server-core sends the browser
         * there once a sign-in is complete; the console service rebases its
         * asset URLs and links onto it. Only the path may differ from
         * publicUrl, never the origin. `port` and `host` (the console's own
         * listener, used by `authup start console`) are documented in the
         * Console Replicas guide.
         * env: ADMIN_CONSOLE_URL
         * default: '' (derived: <publicUrl>/console/admin)
         */
        url: '',

        /**
         * Serve the admin console at `<publicUrl>/console/admin` (realms, clients,
         * users, roles, permissions, policies, keys, sessions, events).
         * Disable it to administer the instance through the API alone.
         * env: ADMIN_CONSOLE_ENABLED
         * default: true
         */
        enabled: true,

        /**
         * EXPERIMENTAL. Package directory replacing the served admin console. It
         * points at a directory holding the built dist/. Empty resolves the
         * packaged console from node_modules. See the Theming guide.
         * A source checkout there is served from source with hot module
         * replacement by `authup dev` instead (also EXPERIMENTAL; see the
         * Quick Start guide).
         * env: ADMIN_CONSOLE_PATH
         * default: ''
         */
        path: '',
    },

    accountConsole: {
        /**
         * Where the account console is published, same rules as
         * adminConsole.url above.
         * env: ACCOUNT_CONSOLE_URL
         * default: '' (derived: <publicUrl>/console/account)
         */
        url: '',

        /**
         * Serve the account self-service surface at `<publicUrl>/console/account`
         * (profile, password, authenticators, sessions, applications).
         * Disable it when you run your own self-service portal.
         * env: ACCOUNT_CONSOLE_ENABLED
         * default: true
         */
        enabled: true,

        /**
         * EXPERIMENTAL. Package directory replacing the served account console. It
         * points at a directory holding the built dist/. Empty resolves the
         * packaged console from node_modules. See the Theming guide.
         * A source checkout there is served from source with hot module
         * replacement by `authup dev` instead (also EXPERIMENTAL; see the
         * Quick Start guide).
         * env: ACCOUNT_CONSOLE_PATH
         * default: ''
         */
        path: '',
    },

    authConsole: {
        /**
         * Where the hosted login, consent and workflow pages are published.
         * The six page GETs on this server redirect there, carrying the
         * request's own query. Same rules as adminConsole.url above; there is
         * no `enabled`, because those pages are the issuance surface.
         * env: AUTH_CONSOLE_URL
         * default: '' (derived: <publicUrl>/console/auth)
         */
        url: '',

        /**
         * EXPERIMENTAL. Package directory replacing the served auth console. It
         * points at a directory holding the built dist/. Empty resolves the
         * packaged console from node_modules. See the Theming guide.
         * A source checkout there is served from source with hot module
         * replacement by `authup dev` instead (also EXPERIMENTAL; see the
         * Quick Start guide).
         * env: AUTH_CONSOLE_PATH
         * default: ''
         */
        path: '',
    },

    core: {
        /**
         * Directory the production log files are written to. This is the one
         * directory the process writes to. Relative paths are resolved
         * against rootPath. The SQLite database is NOT placed here - its path
         * comes from the database configuration (db.database / DB_DATABASE).
         * env: LOG_DIRECTORY_PATH
         * default: logs
         */
        logDirectoryPath: 'logs',

        /**
         * Directory file-based provisioning is read from. Operator-authored
         * input, read-only to the process, so it belongs next to the
         * configuration file rather than in the log directory. Relative paths
         * are resolved against rootPath.
         * env: PROVISIONING_DIRECTORY_PATH
         * default: provisioning
         */
        provisioningDirectoryPath: 'provisioning',

        /**
         * Enable logging. File-only (no environment variable).
         * default: true
         */
        logger: true,

        worker: {
            /**
             * Run the worker (the background cron sweeps) in this process.
             * Under the default mode the API runs it alongside itself; set
             * false on API replicas when a dedicated
             * `authup start worker` process runs it. Worker mode
             * refuses to start when this is false. Set it false only once
             * such a process exists: with it false everywhere, nothing
             * sweeps. See the Worker guide.
             * env: WORKER_ENABLED
             * default: true
             */
            enabled: true,
        },

        /**
         * Apply pending schema migrations at startup. When false, startup runs
         * no DDL: it verifies that no migration is pending and fails loud
         * otherwise, so a replica never races a sibling for the same DDL. Run
         * `authup migration run` as a separate step instead; that command
         * is unaffected by this option. Ignored on SQLite, which ships no
         * migrations and always synchronizes its schema. See the Worker guide.
         * env: MIGRATION_ENABLED
         * default: true
         */
        migrationEnabled: true,

        /**
         * Application port number.
         * env: PORT
         * default: 3000
         */
        port: 3000,

        /**
         * Address the HTTP server binds to. Has no environment variable of
         * its own: HOST sets the top-level `host`, which this listener and
         * every console listener inherit unless they name their own.
         * default: the top-level host (0.0.0.0, all interfaces)
         */
        host: '0.0.0.0',

        /**
         * Optional public base URL whose proxy requests TLS client certificates.
         * Published in OpenID discovery as RFC 8705 mtls_endpoint_aliases.
         * Requires certificateSource to be enabled.
         * env: MTLS_PUBLIC_URL
         * default: null
         */
        mtlsPublicUrl: 'https://mtls.example.com',

        /**
         * Trusted-proxy certificate header contract:
         * - disabled: ignore certificate headers (default)
         * - standard: RFC 9440 Client-Cert / Client-Cert-Chain
         * - forwarded: X-Forwarded-Tls-Client-Cert escaped PEM leaf
         *
         * Enabling this requires a private backend listener and a proxy that
         * removes/overwrites public certificate headers on every request.
         * env: CERTIFICATE_SOURCE
         * default: disabled
         */
        certificateSource: 'forwarded',

        /**
         * Which upstream proxies to trust when deriving the client IP from
         * X-Forwarded-For: true trusts every hop, false trusts none (the
         * socket peer address is used), a number trusts that many hops, and
         * a string / list is an allowlist of proxy IPs, CIDRs, or the
         * presets loopback, linklocal, uniquelocal.
         *
         * Security: with `true` (the default), a DIRECT client can spoof
         * its IP via X-Forwarded-For — login-throttle keys, audit events,
         * the access log, and the session inventory then record the forged
         * value. Pin the actual proxy (e.g. 1, or loopback for a same-host
         * proxy) when the listener is reachable without a proxy or exact
         * attribution matters. String forms are canonicalized: "1" means
         * one trusted hop (never trust-all), "true"/"false" parse as
         * booleans, anything else is a comma-separated allowlist. Allowlist
         * entries are trimmed and lowercased, so " LOOPBACK " is accepted;
         * a hop count outside the safe integer range is rejected at boot.
         * env: TRUST_PROXY
         * default: true
         */
        trustProxy: 1,

        // ----------------------------------------------------

        /**
         * Built-in HTTP middlewares. Each accepts a boolean or an options
         * object (options objects require the js/ts file variant), except
         * middlewareSwagger, which is boolean-only.
         * File-only (no environment variables).
         * default: true (each)
         */
        middlewareBody: true,       // request body parsing
        middlewareCookie: true,     // cookie parsing
        middlewareCors: true,       // CORS (reflects any origin by default;
                                    // pass options for an explicit allowlist)
        middlewarePrometheus: true, // /metrics endpoint
        middlewareQuery: true,      // query-string parsing
        middlewareRateLimit: true,  // rate limiting
        middlewareSwagger: true,    // /docs endpoint

        // ----------------------------------------------------

        /**
         * Refresh token validity in seconds (default: 259,200s / 3 days).
         * env: TOKEN_REFRESH_MAX_AGE
         * default: 259_200
         */
        tokenRefreshMaxAge: 259_200,

        /**
         * Access token validity in seconds (default: 900s / 15 minutes).
         * env: TOKEN_ACCESS_MAX_AGE
         * default: 900
         */
        tokenAccessMaxAge: 900,

        /**
         * Grace period (seconds) during which a just-rotated refresh token is
         * still accepted, minting new chain-linked tokens instead of triggering
         * replay detection. Absorbs multi-tab / mobile refresh races.
         * env: TOKEN_REFRESH_GRACE_PERIOD
         * default: 0 (strict — first-use-wins)
         */
        tokenRefreshGracePeriod: 0,

        /**
         * Max age (seconds) of the authentication that a `prompt=login` / `max_age`
         * authorize request accepts before forcing re-authentication. Judged against
         * the session's creation time — a stateless approximation.
         * env: PROMPT_LOGIN_MAX_AGE
         * default: 60
         */
        promptLoginMaxAge: 60,

        /**
         * Seconds past its expiry an (expired) id_token_hint presented at the
         * RP-initiated logout endpoint (/logout) is still accepted for a
         * server-side session revoke. Bounds how long a leaked id_token stays a
         * replayable remote logout; beyond the window the click-gated confirm
         * page still works.
         * env: END_SESSION_HINT_GRACE_PERIOD
         * default: 0 (unbounded — spec/Keycloak parity)
         */
        endSessionHintGracePeriod: 0,

        // ----------------------------------------------------

        /**
         * Enable user registration?
         * env: REGISTRATION_ENABLED
         * default: false
         */
        registrationEnabled: false,

        /**
         * Require email verification for registration or login?
         * env: EMAIL_VERIFICATION_ENABLED
         * default: false
         */
        emailVerificationEnabled: false,

        /**
         * Allow password reset via email?
         * env: PASSWORD_RECOVERY_ENABLED
         * default: false
         */
        passwordRecoveryEnabled: false,

        /**
         * Minimum length for user-chosen passwords (user create/update,
         * registration, password reset). The maximum is fixed at 512.
         * env: PASSWORD_MIN_LENGTH
         * default: 10
         */
        passwordMinLength: 10,

        /**
         * Persist security events (login, loginFailed, authorize,
         * logout, refresh replay, ...) to the auth_events table.
         * env: EVENT_LOG_ENABLED
         * default: true
         */
        eventLogEnabled: true,

        /**
         * Retention for persisted security events in days. Raise it for
         * longer compliance windows; 0 = keep forever.
         * env: EVENT_LOG_RETENTION_DAYS
         * default: 90
         */
        eventLogRetentionDays: 90,

        /**
         * Additionally mirror every entity create/update/delete into the
         * auth_events table (scope: entity). Only effective while
         * eventLogEnabled is true.
         * env: EVENT_LOG_ENTITY_ENABLED
         * default: true
         */
        eventLogEntityEnabled: true,

        /**
         * Retention for entity create/update/delete events in days —
         * deliberately short so entity churn self-prunes. 0 = keep forever.
         * env: EVENT_LOG_ENTITY_RETENTION_DAYS
         * default: 7
         */
        eventLogEntityRetentionDays: 7,

        /**
         * Throttle failed logins per (identifier, ip) pair by counting recent
         * loginFailed events. Requires eventLogEnabled.
         * The IP half of the key follows `trustProxy` — pin it to the actual
         * proxy (hops or allowlist) so a direct client cannot spoof the IP
         * via X-Forwarded-For.
         * env: LOGIN_ATTEMPT_THROTTLE_ENABLED
         * default: false
         */
        loginAttemptThrottleEnabled: false,

        /**
         * Failed attempts per (identifier, ip) pair within the window before
         * the pair is throttled (HTTP 429).
         * env: LOGIN_ATTEMPT_THRESHOLD
         * default: 5
         */
        loginAttemptThreshold: 5,

        /**
         * Sliding throttle window in seconds.
         * env: LOGIN_ATTEMPT_WINDOW
         * default: 900
         */
        loginAttemptWindow: 900,

        /**
         * Optional base64-encoded 32-byte key (AES-256-GCM) wrapping the
         * realm key store's material at rest — the per-realm JWT signing
         * private keys and the auto-generated per-realm encryption keys
         * that protect MFA seeds. Generate one with:
         * openssl rand -base64 32
         * or:
         * node -e "console.log(crypto.randomBytes(32).toString('base64'))"
         * Must be standard base64 (+, /, = padding) decoding to exactly
         * 32 bytes — base64url or any other length is rejected at startup.
         * Unset, key material is stored unwrapped in the database (the
         * Keycloak/authentik posture). Setting it later wraps existing
         * rows lazily on read; removing it while wrapped rows exist fails
         * loud at first use, so treat it as a long-lived secret.
         * env: SECRETS_ENCRYPTION_KEY
         * default: '' (unset)
         */
        secretsEncryptionKey: '',

        /**
         * Enable multi-factor authentication. Users can enroll authenticator
         * devices (TOTP app, recovery codes); a user holding a confirmed
         * device must present a second factor on interactive authorization
         * and on the password grant (otp parameter). Seed-encryption keys
         * are generated per realm automatically — no further configuration
         * is required.
         * env: MFA_ENABLED
         * default: false
         */
        mfaEnabled: false,

        /**
         * Enforce MFA for every user: a user without a confirmed device is
         * routed to inline enrollment at next interactive login.
         * Requires mfaEnabled.
         * env: MFA_REQUIRED
         * default: false
         */
        mfaRequired: false,

        /**
         * Max age (seconds) of the session's second-factor proof an
         * acr_values=urn:authup:mfa step-up request accepts before forcing
         * a fresh challenge.
         * env: MFA_FRESHNESS_MAX_AGE
         * default: 60
         */
        mfaFreshnessMaxAge: 60,

        /**
         * Lifetime (seconds) of the MFA-pending login ticket a fresh
         * interactive login receives when its second factor needs an
         * interactive challenge (email / WebAuthn) — and of the pending
         * session backing it.
         * env: MFA_TICKET_MAX_AGE
         * default: 600
         */
        mfaTicketMaxAge: 600,

        // ----------------------------------------------------

        /**
         * Permit HTTP Basic authentication with client credentials
         * against the management API.
         * env: CLIENT_AUTH_BASIC
         * default: false
         */
        clientAuthBasic: false,

        /**
         * Activate the built-in `system` client of the master realm.
         * env: CLIENT_SYSTEM_ENABLED
         * default: false
         */
        clientSystemEnabled: false,

        /**
         * The secret of the built-in `system` client.
         * env: CLIENT_SYSTEM_SECRET
         * default: 'start123'
         */
        clientSystemSecret: '<unique-secret>',

        /**
         * Reset the `system` client secret on application startup.
         * env: CLIENT_SYSTEM_SECRET_RESET
         * default: false
         */
        clientSystemSecretReset: false,

        // ----------------------------------------------------

        /**
         * Permit HTTP Basic authentication with user credentials
         * against the management API.
         * env: USER_AUTH_BASIC
         * default: false
         */
        userAuthBasic: false,

        /**
         * Enable default admin user.
         * env: USER_ADMIN_ENABLED
         * default: true
         */
        userAdminEnabled: true,

        /**
         * The password of the default admin user.
         * env: USER_ADMIN_PASSWORD
         * default: 'start123'
         */
        userAdminPassword: '<strong-password>',

        /**
         * Reset admin password on application startup.
         * env: USER_ADMIN_PASSWORD_RESET
         * default: false
         */
        userAdminPasswordReset: false,

        // ----------------------------------------------------

        /**
         * Additional (non-built-in) permission names to provision on startup.
         * env: PERMISSIONS (comma-separated)
         * default: []
         */
        permissions: [],

        /**
         * Auto-assign the system.default policy to new permissions
         * created without an explicit policyId.
         * Transitional option — will be removed in the next major release.
         * Set to false to opt into the allow-by-default model.
         * env: PERMISSIONS_DEFAULT_POLICY_ASSIGNMENT
         * default: true
         */
        permissionsDefaultPolicyAssignment: true,
    },
}
```

```yaml [authup.yml]
# yaml-language-server: $schema=https://authup.org/schema/config.json
env: production
publicUrl: http://localhost:3000
trustedOrigins:
  - https://app.example.com

theme:
  directoryPath: /etc/authup/theme
  fragmentsEnabled: false

adminConsole:
  enabled: true
  path: ''
accountConsole:
  enabled: true
  path: ''
authConsole:
  path: ''
core:
  logDirectoryPath: logs
  provisioningDirectoryPath: provisioning
  worker:
    enabled: true
  migrationEnabled: true
  port: 3000
  host: 0.0.0.0
  mtlsPublicUrl: https://mtls.example.com
  certificateSource: forwarded
  trustProxy: 1
  tokenRefreshMaxAge: 259200
  tokenAccessMaxAge: 900
  tokenRefreshGracePeriod: 0
  promptLoginMaxAge: 60
  endSessionHintGracePeriod: 0
  registrationEnabled: false
  emailVerificationEnabled: false
  passwordRecoveryEnabled: false
  passwordMinLength: 10
  eventLogEnabled: true
  eventLogRetentionDays: 90
  eventLogEntityEnabled: true
  eventLogEntityRetentionDays: 7
  loginAttemptThrottleEnabled: false
  loginAttemptThreshold: 5
  loginAttemptWindow: 900
  secretsEncryptionKey: ''
  mfaEnabled: false
  mfaRequired: false
  mfaFreshnessMaxAge: 60
  mfaTicketMaxAge: 600
  clientAuthBasic: false
  clientSystemEnabled: false
  clientSystemSecret: '<unique-secret>'
  clientSystemSecretReset: false
  userAuthBasic: false
  userAdminEnabled: true
  userAdminPassword: '<strong-password>'
  userAdminPasswordReset: false
  permissionsDefaultPolicyAssignment: true
```

```dotenv [.env]
NODE_ENV=production
LOG_DIRECTORY_PATH=logs
PROVISIONING_DIRECTORY_PATH=provisioning
THEME_DIRECTORY_PATH=/etc/authup/theme
THEME_FRAGMENTS_ENABLED=false
WORKER_ENABLED=true
MIGRATION_ENABLED=true
PORT=3000
HOST=0.0.0.0
PUBLIC_URL=http://localhost:3000
MTLS_PUBLIC_URL=https://mtls.example.com
CERTIFICATE_SOURCE=forwarded
TRUST_PROXY=1
TRUSTED_ORIGINS=https://app.example.com
TOKEN_REFRESH_MAX_AGE=259200
TOKEN_ACCESS_MAX_AGE=900
TOKEN_REFRESH_GRACE_PERIOD=0
PROMPT_LOGIN_MAX_AGE=60
END_SESSION_HINT_GRACE_PERIOD=0
REGISTRATION_ENABLED=false
EMAIL_VERIFICATION_ENABLED=false
PASSWORD_RECOVERY_ENABLED=false
PASSWORD_MIN_LENGTH=10
ACCOUNT_CONSOLE_ENABLED=true
ADMIN_CONSOLE_ENABLED=true
EVENT_LOG_ENABLED=true
EVENT_LOG_RETENTION_DAYS=90
EVENT_LOG_ENTITY_ENABLED=true
EVENT_LOG_ENTITY_RETENTION_DAYS=7
LOGIN_ATTEMPT_THROTTLE_ENABLED=false
LOGIN_ATTEMPT_THRESHOLD=5
LOGIN_ATTEMPT_WINDOW=900
SECRETS_ENCRYPTION_KEY=
MFA_ENABLED=false
MFA_REQUIRED=false
MFA_FRESHNESS_MAX_AGE=60
MFA_TICKET_MAX_AGE=600
CLIENT_AUTH_BASIC=false
CLIENT_SYSTEM_ENABLED=false
CLIENT_SYSTEM_SECRET=<unique-secret>
CLIENT_SYSTEM_SECRET_RESET=false
USER_AUTH_BASIC=false
USER_ADMIN_ENABLED=true
USER_ADMIN_PASSWORD=<strong-password>
USER_ADMIN_PASSWORD_RESET=false
PERMISSIONS_DEFAULT_POLICY_ASSIGNMENT=true

```
:::

::: tip File-only options
`rootPath`, `logger` and the `middleware*` options have no environment
variable — set them in a configuration file. Middleware *options objects*
(e.g. an explicit CORS allowlist) additionally require the `js`/`ts` file
variant, since they cannot be expressed as flat strings.
:::
