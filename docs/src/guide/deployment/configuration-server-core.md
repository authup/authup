# Configuration

The API configuration can be provided in different file formats, 
such as `authup.server.core.{conf,js,ts,...}`.

The environment variables in the .env file variant can also be provided via runtime environment.

::: danger Security
Always change the default admin password (`start123`) and robot secret before deploying to production.
:::

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
trustedOrigins=https://app.example.com
registrationEnabled=false
emailVerificationEnabled=false
passwordRecoveryEnabled=false
passwordMinLength=10
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
TRUSTED_ORIGINS=https://app.example.com
REGISTRATION_ENABLED=false
EMAIL_VERIFICATION_ENABLED=false
PASSWORD_RECOVERY_ENABLED=false
PASSWORD_MIN_LENGTH=10
USER_ADMIN_PASSWORD=start123
USER_ADMIN_PASSWORD_RESET=false
ROBOT_ADMIN_ENABLED=false
ROBOT_ADMIN_SECRET=start123
ROBOT_ADMIN_SECRET_RESET=false
PERMISSIONS_DEFAULT_POLICY_ASSIGNMENT=true

```
:::
