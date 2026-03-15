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
     * default: http://localhost:3001
     */
    publicUrl: 'http://localhost:3001',

    /**
     * Domain for setting cookies after authorization.
     */
    cookieDomain: undefined,
    
    // ----------------------------------------------------

    /**
     * Refresh token validity in seconds (default: 259,200s / 3 days).
     * default: 259_200
     */
    tokenRefreshMaxAge: 259_200,

    /**
     * Access token validity in seconds (default: 3600s / 1 hour).
     * default: 3_600
     */
    tokenAccessMaxAge: 3_600,

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
registrationEnabled=false
emailVerificationEnabled=false
passwordRecoveryEnabled=false
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
REGISTRATION_ENABLED=false
EMAIL_VERIFICATION_ENABLED=false
PASSWORD_RECOVERY_ENABLED=false
USER_ADMIN_PASSWORD=start123
USER_ADMIN_PASSWORD_RESET=false
ROBOT_ADMIN_ENABLED=false
ROBOT_ADMIN_SECRET=start123
ROBOT_ADMIN_SECRET_RESET=false
PERMISSIONS_DEFAULT_POLICY_ASSIGNMENT=true

```
:::
