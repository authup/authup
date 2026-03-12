# Configuration

The API configuration can be provided in different file formats, 
such as `authup.api.{conf,js,ts,...}`.

The environment variables in the .env file variant can also be provided via runtime environment.

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
    
    /**
     * Redirect URL after successful login with
     * external identity provider.
     * default: http://localhost:3000
     */
    authorizeRedirectUrl: 'http://localhost:3000',

    // ----------------------------------------------------

    /**
     * Refresh token validity in seconds (default: 259,200s / 3 days).
     * default: 259_000
     */
    tokenRefreshMaxAge: 259_000,

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
    registration: false,
    
    /**
     * Require email verification for registration or login?
     * default: false
     */
    emailVerification: false,
    
    /**
     * Allow password reset via email?
     * default: false
     */
    forgotPassword: false,

    // ----------------------------------------------------

    /**
     * Enable default admin user.
     * default: true
     */
    userAdminEnabled: true,
    
    /**
     * The name of the default admin user.
     * default: 'admin'
     */
    userAdminName: 'admin',
    
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
     * The name of the default robot.
     * default: system
     */
    robotAdminName: 'system',
    
    /**
     * The secret of the default admin user.
     * default: (generated)
     */
    robotAdminSecret: 'foo',
    
    /**
     * Reset the robot secret on application startup.
     * default: false
     */
    robotAdminSecretReset: false
}
```

```dotenv [authup.server.core.conf]
port=3001
publicUrl=http://localhost:3001
authorizeRedirectUrl=http://localhost:3000
registration=false
emailVerification=false
forgotPassword=false
userAdminName=admin
userAdminPassword=start123
userAdminPasswordReset=false
robotAdminEnabled=false
robotAdminName=system
robotAdminSecret=foo
robotAdminSecretReset=false

```

```dotenv [.env]
PORT=3001
PUBLIC_URL=http://localhost:3001
AUTHORIZE_REDIRECT_URL=http://localhost:3000
REGISTRATION=false
EMAIL_VERIFICATION=false
FORGOT_PASSWORD=false
USER_ADMIN_NAME=admin
USER_ADMIN_PASSWORD=start123
USER_ADMIN_PASSWORD_RESET=false
ROBOT_ADMIN_ENABLED=false
ROBOT_ADMIN_NAME=system
ROBOT_ADMIN_SECRET=foo
ROBOT_ADMIN_SECRET_RESET=false

```
:::
