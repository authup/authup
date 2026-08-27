/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { USER_PASSWORD_MAX_LENGTH, USER_PASSWORD_MIN_LENGTH } from '@authup/core-kit';
import type { ConfigSchema } from '@authup/server-config-kit';
import {
    readEnvArray,
    readEnvBool,
    readEnvBoolStrict,
    readEnvInt,
    readEnvRaw,
    readEnvString,
} from '@authup/server-config-kit';
import { z } from 'zod';
import { ConfigEnvironmentVariableName } from '../constants.ts';
import { CERTIFICATE_SOURCES, EVENT_LOG_RETENTION_DAYS_DEFAULT } from './constants.ts';
import { isValidTrustProxyListEntry } from './trust-proxy.ts';
import type { CoreConfig, MiddlewareOptions } from './types.ts';

// ---------------------------------------------------------------
// shared shapes
// ---------------------------------------------------------------

const stringType = z.string();
const booleanType = z.boolean();
const nonNegativeNumberType = z.number().nonnegative();
const positiveIntegerType = z.number().int().positive();
const secretType = z.string().min(3).max(256);
const middlewareType = z.boolean().or(z.record(z.string(), z.any()));

// ---------------------------------------------------------------
// registry
// ---------------------------------------------------------------

/**
 * The `server.core.*` section: the API and IdP service's own keys.
 *
 * Every entry spells its absolute `path`, so a merge of all six sections into
 * one document schema needs no prefix left over from the reading pass. The
 * values are the same ones {@link CORE_CONFIG_SECTION} would have produced.
 */
export const CORE_CONFIG_SCHEMA = {
    writableDirectoryPath: {
        type: stringType,
        default: 'writable',
        description: 'Directory the application writes to at runtime (production log files) and reads file-based provisioning from. ' +
            'The SQLite database is not placed here; a relative path resolves against rootPath.',
        path: 'server.core.writableDirectoryPath',
        env: ConfigEnvironmentVariableName.WRITABLE_DIRECTORY_PATH,
        readEnv: readEnvString,
    },

    logger: {
        type: booleanType,
        default: true,
        description: 'Enable the application logger.',
        path: 'server.core.logger',
    },

    componentsEnabled: {
        type: booleanType,
        default: true,
        description: 'Run the background components (the cron sweeps) in this process. Set false on API replicas when a dedicated worker process runs them.',
        path: 'server.core.componentsEnabled',
        env: ConfigEnvironmentVariableName.COMPONENTS_ENABLED,
        readEnv: readEnvBoolStrict,
    },
    migrationEnabled: {
        type: booleanType,
        default: true,
        description: 'Apply pending schema migrations at startup. When false, startup runs no DDL and fails loud when migrations are pending; the migration CLI command is unaffected and sqlite always synchronizes.',
        path: 'server.core.migrationEnabled',
        env: ConfigEnvironmentVariableName.MIGRATION_ENABLED,
        readEnv: readEnvBoolStrict,
    },

    port: {
        type: nonNegativeNumberType,
        default: 3001,
        description: 'TCP port the HTTP listener binds.',
        path: 'server.core.port',
        env: ConfigEnvironmentVariableName.PORT,
        readEnv: readEnvInt,
    },
    host: {
        type: stringType,
        default: '0.0.0.0',
        description: 'Host address the HTTP listener binds.',
        path: 'server.core.host',
        env: ConfigEnvironmentVariableName.HOST,
        readEnv: readEnvString,
    },
    mtlsPublicUrl: {
        type: z.url().nullable(),
        default: null,
        description: 'Optional externally reachable base URL dedicated to endpoints that request TLS client certificates, published as RFC 8705 mTLS endpoint aliases. The reverse proxy may route it to the same backend listener.',
        path: 'server.core.mtlsPublicUrl',
        env: ConfigEnvironmentVariableName.MTLS_PUBLIC_URL,
        readEnv: readEnvString,
    },
    certificateSource: {
        type: z.enum(CERTIFICATE_SOURCES),
        default: 'disabled',
        description: 'Trusted-proxy client-certificate header contract: the RFC 9440 Client-Cert headers (standard) or the X-Forwarded-Tls-Client-Cert header (forwarded). ' +
            'Enabling a source asserts that the backend listener is reachable only through a proxy that removes or overwrites the selected headers.',
        path: 'server.core.certificateSource',
        env: ConfigEnvironmentVariableName.CERTIFICATE_SOURCE,
        readEnv: readEnvString,
    },
    trustProxy: {
        type: z.union([
            z.boolean(),
            z.number().int().nonnegative(),
            // scalar strings are canonicalized by the consuming service
            // (integer and boolean words become their semantic type)
            z.string(),
            // the explicit allowlist form: an integer-string or boolean
            // word entry is a mis-typed scalar and must fail loud, since
            // proxy-addr would silently compile '1' to 0.0.0.1
            z.array(z.string().refine(
                isValidTrustProxyListEntry,
                'must be an IP, CIDR, or proxy-addr preset',
            )),
        ]),
        default: true,
        description: 'Which upstream proxies to trust when deriving the client IP from X-Forwarded-For: true trusts every hop, false trusts none, a number trusts that many hops, a string or string list is a proxy-addr allowlist (IPs, CIDRs, or the presets loopback, linklocal, uniquelocal). ' +
            'SECURITY: with every hop trusted any direct client can spoof its IP into the login throttle, the audit log and the session inventory; pin the actual proxy when the listener is reachable without one.',
        path: 'server.core.trustProxy',
        env: ConfigEnvironmentVariableName.TRUST_PROXY,
        readEnv: readEnvRaw,
    },

    middlewareBody: {
        type: middlewareType,
        default: true,
        description: 'Enable the body-parsing middleware, or pass its options.',
        path: 'server.core.middlewareBody',
    },
    middlewareCors: {
        type: middlewareType,
        default: true,
        description: 'Enable the CORS middleware, or pass its options.',
        path: 'server.core.middlewareCors',
    },
    middlewareCookie: {
        type: middlewareType,
        default: true,
        description: 'Enable the cookie-parsing middleware, or pass its options.',
        path: 'server.core.middlewareCookie',
    },
    middlewarePrometheus: {
        type: middlewareType,
        default: true,
        description: 'Enable the Prometheus metrics middleware, or pass its options.',
        path: 'server.core.middlewarePrometheus',
    },
    middlewareQuery: {
        type: middlewareType,
        default: true,
        description: 'Enable the query-parsing middleware, or pass its options.',
        path: 'server.core.middlewareQuery',
    },
    middlewareRateLimit: {
        type: middlewareType,
        default: true,
        description: 'Enable the rate-limit middleware, or pass its options.',
        path: 'server.core.middlewareRateLimit',
    },
    middlewareSwagger: {
        // a plain boolean, unlike its siblings: the Swagger mount takes no
        // options today, and widening it would start accepting a document
        // shape nothing reads.
        type: booleanType as z.ZodType<MiddlewareOptions>,
        default: true,
        description: 'Serve the Swagger UI and the OpenAPI document.',
        path: 'server.core.middlewareSwagger',
    },

    tokenRefreshMaxAge: {
        type: nonNegativeNumberType,
        default: 259_200,
        description: 'Refresh token validity in seconds.',
        path: 'server.core.tokenRefreshMaxAge',
        env: ConfigEnvironmentVariableName.TOKEN_REFRESH_MAX_AGE,
        readEnv: readEnvInt,
    },
    tokenAccessMaxAge: {
        type: nonNegativeNumberType,
        default: 900,
        description: 'Access token validity in seconds.',
        path: 'server.core.tokenAccessMaxAge',
        env: ConfigEnvironmentVariableName.TOKEN_ACCESS_MAX_AGE,
        readEnv: readEnvInt,
    },
    tokenRefreshGracePeriod: {
        type: nonNegativeNumberType,
        default: 0,
        description: 'Grace period in seconds during which a just-rotated refresh token is still accepted, minting new chain-linked tokens instead of triggering replay detection. Absorbs multi-tab and mobile refresh races; zero is strict (first use wins).',
        path: 'server.core.tokenRefreshGracePeriod',
        env: ConfigEnvironmentVariableName.TOKEN_REFRESH_GRACE_PERIOD,
        readEnv: readEnvInt,
    },
    promptLoginMaxAge: {
        type: nonNegativeNumberType,
        default: 60,
        description: 'Max age in seconds of the authentication a prompt=login or max_age authorize request accepts before forcing re-authentication, judged against the session creation time.',
        path: 'server.core.promptLoginMaxAge',
        env: ConfigEnvironmentVariableName.PROMPT_LOGIN_MAX_AGE,
        readEnv: readEnvInt,
    },
    endSessionHintGracePeriod: {
        type: nonNegativeNumberType,
        default: 0,
        description: 'Seconds past its expiry an expired id_token_hint presented at the RP-initiated logout endpoint is still accepted for a server-side session revoke. Zero accepts any expired hint; beyond the window the click-gated confirm page still works.',
        path: 'server.core.endSessionHintGracePeriod',
        env: ConfigEnvironmentVariableName.END_SESSION_HINT_GRACE_PERIOD,
        readEnv: readEnvInt,
    },

    registrationEnabled: {
        type: booleanType,
        default: false,
        description: 'Enable user self-registration.',
        path: 'server.core.registrationEnabled',
        env: ConfigEnvironmentVariableName.REGISTRATION_ENABLED,
        readEnv: readEnvBool,
    },
    emailVerificationEnabled: {
        type: booleanType,
        default: false,
        description: 'Require email verification for registration or login.',
        path: 'server.core.emailVerificationEnabled',
        env: ConfigEnvironmentVariableName.EMAIL_VERIFICATION_ENABLED,
        readEnv: readEnvBool,
    },
    passwordRecoveryEnabled: {
        type: booleanType,
        default: false,
        description: 'Allow password reset via email.',
        path: 'server.core.passwordRecoveryEnabled',
        env: ConfigEnvironmentVariableName.PASSWORD_RECOVERY_ENABLED,
        readEnv: readEnvBool,
    },
    passwordMinLength: {
        type: z.number().int().positive().max(USER_PASSWORD_MAX_LENGTH),
        default: USER_PASSWORD_MIN_LENGTH,
        description: 'Minimum length for user-chosen passwords (user create and update, registration, password reset). The maximum is fixed at 512.',
        path: 'server.core.passwordMinLength',
        env: ConfigEnvironmentVariableName.PASSWORD_MIN_LENGTH,
        readEnv: readEnvInt,
    },

    eventLogEnabled: {
        type: booleanType,
        default: true,
        description: 'Persist security audit events (login, authorize, replay detection) to the auth_events table. When disabled only the structured log line is emitted.',
        path: 'server.core.eventLogEnabled',
        env: ConfigEnvironmentVariableName.EVENT_LOG_ENABLED,
        readEnv: readEnvBoolStrict,
    },
    eventLogRetentionDays: {
        type: nonNegativeNumberType,
        default: EVENT_LOG_RETENTION_DAYS_DEFAULT,
        description: 'Per-row retention for persisted audit events in days, stamped at write time and swept by the event cleaner. Zero keeps rows forever.',
        path: 'server.core.eventLogRetentionDays',
        env: ConfigEnvironmentVariableName.EVENT_LOG_RETENTION_DAYS,
        readEnv: readEnvInt,
    },
    eventLogEntityEnabled: {
        type: booleanType,
        default: true,
        description: 'Additionally mirror every entity create, update and delete published on the domain-event bus into the auth_events table. Only effective while eventLogEnabled is true.',
        path: 'server.core.eventLogEntityEnabled',
        env: ConfigEnvironmentVariableName.EVENT_LOG_ENTITY_ENABLED,
        readEnv: readEnvBoolStrict,
    },
    eventLogEntityRetentionDays: {
        type: nonNegativeNumberType,
        default: 7,
        description: 'Per-row retention for entity-CRUD audit events in days, deliberately short so entity churn self-prunes. Zero keeps rows forever.',
        path: 'server.core.eventLogEntityRetentionDays',
        env: ConfigEnvironmentVariableName.EVENT_LOG_ENTITY_RETENTION_DAYS,
        readEnv: readEnvInt,
    },
    loginAttemptThrottleEnabled: {
        type: booleanType,
        default: false,
        description: 'Throttle failed interactive logins per (identifier, ip) pair by counting recent loginFailed audit events. Requires eventLogEnabled.',
        path: 'server.core.loginAttemptThrottleEnabled',
        env: ConfigEnvironmentVariableName.LOGIN_ATTEMPT_THROTTLE_ENABLED,
        readEnv: readEnvBoolStrict,
    },
    loginAttemptThreshold: {
        type: positiveIntegerType,
        default: 5,
        description: 'Failed attempts per (identifier, ip) pair within the window before the pair is throttled.',
        path: 'server.core.loginAttemptThreshold',
        env: ConfigEnvironmentVariableName.LOGIN_ATTEMPT_THRESHOLD,
        readEnv: readEnvInt,
    },
    loginAttemptWindow: {
        type: positiveIntegerType,
        default: 900,
        description: 'Sliding login-throttle window in seconds.',
        path: 'server.core.loginAttemptWindow',
        env: ConfigEnvironmentVariableName.LOGIN_ATTEMPT_WINDOW,
        readEnv: readEnvInt,
    },

    secretsEncryptionKey: {
        // '' = unset; otherwise a base64 string (the consuming service
        // enforces the decoded 32-byte length at boot).
        type: z.union([z.literal(''), z.base64()]),
        default: '',
        description: 'Optional base64-encoded 32-byte key (AES-256-GCM) wrapping the realm key store material at rest; an empty value leaves the material unwrapped (Keycloak and authentik parity). ' +
            'SECURITY: setting it later wraps rows lazily on read, and removing it while wrapped rows exist fails loud at first use.',
        path: 'server.core.secretsEncryptionKey',
        env: ConfigEnvironmentVariableName.SECRETS_ENCRYPTION_KEY,
        readEnv: readEnvString,
    },

    mfaEnabled: {
        type: booleanType,
        default: false,
        description: 'Multi-factor authentication feature toggle. When enabled, users can enroll authenticator devices, and a user holding a confirmed device must present a second factor on interactive authorization and the password grant.',
        path: 'server.core.mfaEnabled',
        env: ConfigEnvironmentVariableName.MFA_ENABLED,
        readEnv: readEnvBoolStrict,
    },
    mfaRequired: {
        type: booleanType,
        default: false,
        description: 'Enforce MFA for every user: a user without a confirmed device is routed to inline enrollment at the next interactive login. Requires mfaEnabled.',
        path: 'server.core.mfaRequired',
        env: ConfigEnvironmentVariableName.MFA_REQUIRED,
        readEnv: readEnvBoolStrict,
    },
    mfaFreshnessMaxAge: {
        type: nonNegativeNumberType,
        default: 60,
        description: 'Max age in seconds of the session second-factor proof an acr_values=urn:authup:mfa step-up request accepts before forcing a fresh challenge. The window absorbs the hosted challenge round-trip.',
        path: 'server.core.mfaFreshnessMaxAge',
        env: ConfigEnvironmentVariableName.MFA_FRESHNESS_MAX_AGE,
        readEnv: readEnvInt,
    },
    mfaTicketMaxAge: {
        type: positiveIntegerType,
        default: 600,
        description: 'Lifetime in seconds of the MFA-pending login ticket the password grant issues when the second factor cannot ride the single POST (email, WebAuthn), and of the pending session backing it. Sized to cover the email OTP window.',
        path: 'server.core.mfaTicketMaxAge',
        env: ConfigEnvironmentVariableName.MFA_TICKET_MAX_AGE,
        readEnv: readEnvInt,
    },

    clientAuthBasic: {
        type: booleanType,
        default: false,
        description: 'Accept HTTP Basic authentication with client credentials on the management API.',
        path: 'server.core.clientAuthBasic',
        env: ConfigEnvironmentVariableName.CLIENT_AUTH_BASIC,
        readEnv: readEnvBool,
    },
    clientSystemEnabled: {
        type: booleanType,
        default: false,
        description: 'Provision the system client in the master realm.',
        path: 'server.core.clientSystemEnabled',
        env: ConfigEnvironmentVariableName.CLIENT_SYSTEM_ENABLED,
        readEnv: readEnvBool,
    },
    clientSystemSecret: {
        type: secretType,
        default: 'start123',
        description: 'Secret of the system client.',
        path: 'server.core.clientSystemSecret',
        env: ConfigEnvironmentVariableName.CLIENT_SYSTEM_SECRET,
        readEnv: readEnvString,
    },
    clientSystemSecretReset: {
        type: booleanType,
        default: false,
        description: 'Reset the system client secret on application startup.',
        path: 'server.core.clientSystemSecretReset',
        env: ConfigEnvironmentVariableName.CLIENT_SYSTEM_SECRET_RESET,
        readEnv: readEnvBool,
    },

    userAuthBasic: {
        type: booleanType,
        default: false,
        description: 'Accept HTTP Basic authentication with user credentials on the management API.',
        path: 'server.core.userAuthBasic',
        env: ConfigEnvironmentVariableName.USER_AUTH_BASIC,
        readEnv: readEnvBool,
    },
    userAdminEnabled: {
        type: booleanType,
        default: true,
        description: 'Provision the default admin user.',
        path: 'server.core.userAdminEnabled',
        env: ConfigEnvironmentVariableName.USER_ADMIN_ENABLED,
        readEnv: readEnvBool,
    },
    userAdminPassword: {
        type: secretType,
        default: 'start123',
        description: 'Password of the default admin user.',
        path: 'server.core.userAdminPassword',
        env: ConfigEnvironmentVariableName.USER_ADMIN_PASSWORD,
        readEnv: readEnvString,
    },
    userAdminPasswordReset: {
        type: booleanType,
        default: false,
        description: 'Reset the admin password on application startup.',
        path: 'server.core.userAdminPasswordReset',
        env: ConfigEnvironmentVariableName.USER_ADMIN_PASSWORD_RESET,
        readEnv: readEnvBool,
    },

    permissions: {
        type: z.string().or(z.array(z.string())),
        default: [],
        description: 'Additional permission names to provision, as a list or a comma-separated string.',
        path: 'server.core.permissions',
        env: ConfigEnvironmentVariableName.PERMISSIONS,
        readEnv: readEnvArray,
    },
    permissionsDefaultPolicyAssignment: {
        type: booleanType,
        default: true,
        description: 'Auto-assign the system.default policy to new permissions without policies. Deprecated, to be removed in v2.0.0: external systems should assign policies explicitly.',
        path: 'server.core.permissionsDefaultPolicyAssignment',
        env: ConfigEnvironmentVariableName.PERMISSIONS_DEFAULT_POLICY_ASSIGNMENT,
        readEnv: readEnvBool,
    },
} satisfies ConfigSchema<CoreConfig, never, ConfigEnvironmentVariableName>;
