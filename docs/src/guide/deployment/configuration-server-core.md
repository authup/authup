# Configuration

The API configuration can be provided in different file formats, 
such as `authup.server.core.{conf,js,ts,...}`.

The environment variables in the .env file variant can also be provided via runtime environment.

::: danger Security
Always change the default admin password (`start123`) and robot secret before deploying to production.
:::

For MFA enforcement behavior and its federated-login, password-grant, feature-toggle,
and cache-availability boundaries, see [Multi-factor authentication](./configuration-server-core-mfa.md).

::: code-group

```typescript [authup.server.core.ts]

export default {
    /**
     * Application environment (e.g., 'production').
     * default: development
     */
    env: 'production',
    
    /**
     * Application port number.
     * default: 3001
     */
    port: 3001,

    /**
     * Application host.
     * default: localhost
     */
    host: 'localhost',
    
    /**
     * API base URL.
     * May include a path prefix (e.g. https://example.com/auth) when the
     * server runs behind a reverse proxy that strips the prefix — asset
     * URLs and links of the built-in auth pages are rebased onto it
     * automatically.
     * default: http://localhost:3001
     */
    publicUrl: 'http://localhost:3001',

    /**
     * Optional public base URL whose proxy requests TLS client certificates.
     * Published in OpenID discovery as RFC 8705 mtls_endpoint_aliases.
     * Requires certificateSource to be enabled.
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
     * default: disabled
     */
    certificateSource: 'forwarded',

    /**
     * Additional trusted origins. Entries are http(s) origins
     * (e.g. https://app.example.com; other protocols are rejected) or
     * bare hosts (e.g. hub.local, hub.local:8080); a bare host expands
     * to both its http and https origin — pass a full origin to
     * restrict to one scheme.
     * Each origin is added to the redirect-URI allowlist of the per-realm
     * public `web` client (as `<origin>/**`).
     * The origin of `publicUrl` is always trusted implicitly.
     *
     * Security: the `web` client is built-in with global scope, so any
     * allowlisted origin can complete a login and obtain a full-permission
     * token — only add origins you control. In non-production, the
     * client-web dev origin (http://localhost:3000) is seeded automatically.
     * default: []
     */
    trustedOrigins: ['https://app.example.com'],

    // ----------------------------------------------------

    /**
     * Refresh token validity in seconds (default: 259,200s / 3 days).
     * default: 259_200
     */
    tokenRefreshMaxAge: 259_200,

    /**
     * Access token validity in seconds (default: 900s / 15 minutes).
     * default: 900
     */
    tokenAccessMaxAge: 900,

    /**
     * Grace period (seconds) during which a just-rotated refresh token is
     * still accepted, minting new chain-linked tokens instead of triggering
     * replay detection. Absorbs multi-tab / mobile refresh races.
     * default: 0 (strict — first-use-wins)
     */
    tokenRefreshGracePeriod: 0,

    /**
     * Max age (seconds) of the authentication that a `prompt=login` / `max_age`
     * authorize request accepts before forcing re-authentication. Judged against
     * the session's creation time — a stateless approximation.
     * default: 60
     */
    promptLoginMaxAge: 60,

    /**
     * Seconds past its expiry an (expired) id_token_hint presented at the
     * RP-initiated logout endpoint (/logout) is still accepted for a
     * server-side session revoke. Bounds how long a leaked id_token stays a
     * replayable remote logout; beyond the window the click-gated confirm
     * page still works.
     * default: 0 (unbounded — spec/Keycloak parity)
     */
    endSessionHintGracePeriod: 0,

    // ----------------------------------------------------
    
    /**
     * Enable user registration?
     * default: false
     */
    registrationEnabled: false,

    /**
     * Require email verification for registration or login?
     * default: false
     */
    emailVerificationEnabled: false,

    /**
     * Allow password reset via email?
     * default: false
     */
    passwordRecoveryEnabled: false,

    /**
     * Minimum length for user-chosen passwords (user create/update,
     * registration, password reset). The maximum is fixed at 512.
     * default: 10
     */
    passwordMinLength: 10,

    /**
     * Persist security events (login, loginFailed, authorize,
     * logout, refresh replay, ...) to the auth_events table.
     * default: true
     */
    eventLogEnabled: true,

    /**
     * Retention for persisted security events in days. Raise it for
     * longer compliance windows; 0 = keep forever.
     * default: 90
     */
    eventLogRetentionDays: 90,

    /**
     * Additionally mirror every entity create/update/delete into the
     * auth_events table (scope: entity). Only effective while
     * eventLogEnabled is true.
     * default: true
     */
    eventLogEntityEnabled: true,

    /**
     * Retention for entity create/update/delete events in days —
     * deliberately short so entity churn self-prunes. 0 = keep forever.
     * default: 7
     */
    eventLogEntityRetentionDays: 7,

    /**
     * Throttle failed logins per (identifier, ip) pair by counting recent
     * loginFailed events. Requires eventLogEnabled.
     * The client IP honors X-Forwarded-For — deploy behind a trusted
     * reverse proxy that overwrites the header, otherwise a direct client
     * can spoof the IP half of the throttle key.
     * default: false
     */
    loginAttemptThrottleEnabled: false,

    /**
     * Failed attempts per (identifier, ip) pair within the window before
     * the pair is throttled (HTTP 429).
     * default: 5
     */
    loginAttemptThreshold: 5,

    /**
     * Sliding throttle window in seconds.
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
     * default: false
     */
    mfaEnabled: false,

    /**
     * Enforce MFA for every user: a user without a confirmed device is
     * routed to inline enrollment at next interactive login.
     * Requires mfaEnabled.
     * default: false
     */
    mfaRequired: false,

    /**
     * Max age (seconds) of the session's second-factor proof an
     * acr_values=urn:authup:mfa step-up request accepts before forcing
     * a fresh challenge.
     * default: 60
     */
    mfaFreshnessMaxAge: 60,

    /**
     * Lifetime (seconds) of the MFA-pending login ticket a fresh
     * interactive login receives when its second factor needs an
     * interactive challenge (email / WebAuthn) — and of the pending
     * session backing it.
     * default: 600
     */
    mfaTicketMaxAge: 600,

    // ----------------------------------------------------

    /**
     * Enable default admin user.
     * default: true
     */
    userAdminEnabled: true,
    
    /**
     * The password of the default admin user.
     * default: 'start123'
     */
    userAdminPassword: 'start123',
    
    /**
     * Reset admin password on application startup.
     * default: false
     */
    userAdminPasswordReset: false,

    // ----------------------------------------------------
    
    /**
     * Enable a global robot account.
     * default: false
     */
    robotAdminEnabled: false,
    
    /**
     * The secret of the default robot.
     * default: 'start123'
     */
    robotAdminSecret: 'start123',
    
    /**
     * Reset the robot secret on application startup.
     * default: false
     */
    robotAdminSecretReset: false,

    // ----------------------------------------------------

    /**
     * Auto-assign the system.default policy to new permissions
     * created without an explicit policy_id.
     * Transitional option — will be removed in the next major release.
     * Set to false to opt into the allow-by-default model.
     * default: true
     */
    permissionsDefaultPolicyAssignment: true,
}
```

```dotenv [authup.server.core.conf]
port=3001
publicUrl=http://localhost:3001
mtlsPublicUrl=https://mtls.example.com
certificateSource=forwarded
trustedOrigins=https://app.example.com
registrationEnabled=false
emailVerificationEnabled=false
passwordRecoveryEnabled=false
passwordMinLength=10
eventLogEnabled=true
eventLogRetentionDays=90
eventLogEntityEnabled=true
eventLogEntityRetentionDays=7
loginAttemptThrottleEnabled=false
loginAttemptThreshold=5
loginAttemptWindow=900
secretsEncryptionKey=
mfaEnabled=false
mfaRequired=false
mfaFreshnessMaxAge=60
mfaTicketMaxAge=600
userAdminPassword=start123
userAdminPasswordReset=false
robotAdminEnabled=false
robotAdminSecret=start123
robotAdminSecretReset=false
permissionsDefaultPolicyAssignment=true

```

```dotenv [.env]
PORT=3001
PUBLIC_URL=http://localhost:3001
MTLS_PUBLIC_URL=https://mtls.example.com
CERTIFICATE_SOURCE=forwarded
TRUSTED_ORIGINS=https://app.example.com
REGISTRATION_ENABLED=false
EMAIL_VERIFICATION_ENABLED=false
PASSWORD_RECOVERY_ENABLED=false
PASSWORD_MIN_LENGTH=10
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
USER_ADMIN_PASSWORD=start123
USER_ADMIN_PASSWORD_RESET=false
ROBOT_ADMIN_ENABLED=false
ROBOT_ADMIN_SECRET=start123
ROBOT_ADMIN_SECRET_RESET=false
PERMISSIONS_DEFAULT_POLICY_ASSIGNMENT=true

```
:::
