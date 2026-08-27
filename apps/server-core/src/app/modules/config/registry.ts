/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { read } from 'envix';
import process from 'node:process';
import { USER_PASSWORD_MAX_LENGTH, USER_PASSWORD_MIN_LENGTH } from '@authup/core-kit';
import { EnvironmentName, isObject } from '@authup/kit';
import {
    readEnvArray,
    readEnvBool,
    readEnvBoolOrString,
    readEnvBoolStrict,
    readEnvInt,
    readEnvRaw,
    readEnvString,
} from '@authup/server-config-kit';
import type { ConfigSchema } from '@authup/server-config-kit';
import type { BetterSqlite3DataSourceOptions } from 'typeorm/driver/better-sqlite3/BetterSqlite3DataSourceOptions.js';
import type { MysqlDataSourceOptions } from 'typeorm/driver/mysql/MysqlDataSourceOptions.js';
import type { PostgresDataSourceOptions } from 'typeorm/driver/postgres/PostgresDataSourceOptions.js';
import { z } from 'zod';
import { CERTIFICATE_SOURCES } from '../../../adapters/http/request/constants.ts';
import { EVENT_LOG_RETENTION_DAYS_DEFAULT } from '../../../core/entities/event/constants.ts';
import { ConfigEnvironmentVariableName } from './constants.ts';
import { expandToOrigins } from './origins.ts';
import { isValidTrustProxyListEntry } from './trust-proxy.ts';
import type { Config, ConfigSchemaDerivedKey } from './types.ts';

// ---------------------------------------------------------------
// shared shapes
// ---------------------------------------------------------------

const stringType = z.string();
const booleanType = z.boolean();
const nonNegativeNumberType = z.number().nonnegative();
const positiveIntegerType = z.number().int().positive();
const secretType = z.string().min(3).max(256);
const middlewareType = z.boolean().or(z.record(z.string(), z.any()));
const serviceType = z.string()
    .or(z.boolean())
    .or(z.custom<Record<string, any>>((value) => isObject(value)));

// ---------------------------------------------------------------
// registry
// ---------------------------------------------------------------

/**
 * The mapped ConfigSchema type is the compile-time exhaustiveness guard: a
 * Config key without an entry here fails the build.
 *
 * An entry's `path` is where the key lives in `authup.yml`. Only the keys
 * that sit OUTSIDE this service's own section declare one: the
 * deployment-wide values (`publicUrl`, `db`, `redis`, `smtp`,
 * `trustedOrigins`, `theme.*`) and the per-console sections, whose names
 * drop the console prefix the config key carries
 * (`adminConsoleEnabled` reads `server.adminConsole.enabled`). Everything
 * else resolves through CONFIG_SECTION to `server.core.<key>`.
 */
export const CONFIG_SCHEMA : ConfigSchema<Config, ConfigSchemaDerivedKey, ConfigEnvironmentVariableName> = {
    env: {
        type: stringType,
        default: () => read('NODE_ENV', EnvironmentName.DEVELOPMENT),
        description: 'Application environment, e.g. production or development.',
        path: 'env',
        env: ConfigEnvironmentVariableName.NODE_ENV,
        readEnv: readEnvString,
    },
    rootPath: {
        type: stringType,
        default: () => process.cwd(),
        path: 'rootPath',
        description: 'Root directory every relative path key resolves against.',
    },
    writableDirectoryPath: {
        type: stringType,
        default: 'writable',
        description: 'Directory the application writes to at runtime (production log files) and reads file-based provisioning from. ' +
            'The SQLite database is not placed here; a relative path resolves against rootPath.',
        env: ConfigEnvironmentVariableName.WRITABLE_DIRECTORY_PATH,
        readEnv: readEnvString,
    },
    adminConsoleUrl: {
        type: z.union([z.literal(''), z.url()]),
        default: '',
        description: 'Where the admin console service (@authup/server-admin-console) is served, e.g. https://example.com/console/admin. ' +
            'The server-side login lands the browser there once the session credential is issued. An empty value derives it from publicUrl, which is the single-origin default.',
        path: 'server.adminConsole.url',
        env: ConfigEnvironmentVariableName.ADMIN_CONSOLE_URL,
        readEnv: readEnvString,
    },
    accountConsoleUrl: {
        type: z.union([z.literal(''), z.url()]),
        default: '',
        description: 'Where the account console service (@authup/server-account-console) is served, e.g. https://example.com/console/account. ' +
            'The server-side login lands the browser there once the session credential is issued. An empty value derives it from publicUrl, which is the single-origin default.',
        path: 'server.accountConsole.url',
        env: ConfigEnvironmentVariableName.ACCOUNT_CONSOLE_URL,
        readEnv: readEnvString,
    },
    authConsoleUrl: {
        type: z.union([z.literal(''), z.url()]),
        default: '',
        description: 'Where the auth console service (@authup/server-auth-console) is served, e.g. https://example.com/console/auth. ' +
            'The hosted login, consent and workflow page GETs redirect there. An empty value derives it from publicUrl, which is the single-origin default.',
        path: 'server.authConsole.url',
        env: ConfigEnvironmentVariableName.AUTH_CONSOLE_URL,
        readEnv: readEnvString,
    },

    logger: {
        type: booleanType,
        default: true,
        description: 'Enable the application logger.',
    },
    // The DB_* variables come from typeorm-extension
    // (hasEnvDataSourceOptions / readDataSourceOptionsFromEnv) and stay
    // special-cased in read/env.ts, outside the registry.
    db: {
        type: z.custom<MysqlDataSourceOptions | PostgresDataSourceOptions | BetterSqlite3DataSourceOptions>(
            (value) => isObject(value),
        ),
        description: 'Database connection (TypeORM data source options). Without one the better-sqlite3 driver default of typeorm-extension applies.',
        path: 'db',
    },
    redis: {
        type: serviceType,
        default: false,
        description: 'Redis connection: a connection URL, client options, an existing client, or a boolean to use the default connection or run without Redis.',
        path: 'redis',
        env: ConfigEnvironmentVariableName.REDIS,
        readEnv: readEnvBoolOrString,
    },
    smtp: {
        type: serviceType,
        default: false,
        description: 'SMTP transport for outgoing mail: a connection URL, transport options, or a boolean to use the default transport or run without mail.',
        path: 'smtp',
        env: ConfigEnvironmentVariableName.SMTP,
        readEnv: readEnvBoolOrString,
    },

    componentsEnabled: {
        type: booleanType,
        default: true,
        description: 'Run the background components (the cron sweeps) in this process. Set false on API replicas when a dedicated worker process runs them.',
        env: ConfigEnvironmentVariableName.COMPONENTS_ENABLED,
        readEnv: readEnvBoolStrict,
    },
    migrationEnabled: {
        type: booleanType,
        default: true,
        description: 'Apply pending schema migrations at startup. When false, startup runs no DDL and fails loud when migrations are pending; the migration CLI command is unaffected and sqlite always synchronizes.',
        env: ConfigEnvironmentVariableName.MIGRATION_ENABLED,
        readEnv: readEnvBoolStrict,
    },

    port: {
        type: nonNegativeNumberType,
        default: 3001,
        description: 'TCP port the HTTP listener binds.',
        env: ConfigEnvironmentVariableName.PORT,
        readEnv: readEnvInt,
    },
    host: {
        type: stringType,
        default: '0.0.0.0',
        description: 'Host address the HTTP listener binds.',
        env: ConfigEnvironmentVariableName.HOST,
        readEnv: readEnvString,
    },
    publicUrl: {
        type: z.url(),
        description: 'Externally reachable base URL of the API. Derived from host and port when unset.',
        path: 'publicUrl',
        env: ConfigEnvironmentVariableName.PUBLIC_URL,
        readEnv: readEnvString,
    },
    mtlsPublicUrl: {
        type: z.url().nullable(),
        default: null,
        description: 'Optional externally reachable base URL dedicated to endpoints that request TLS client certificates, published as RFC 8705 mTLS endpoint aliases. The reverse proxy may route it to the same backend listener.',
        env: ConfigEnvironmentVariableName.MTLS_PUBLIC_URL,
        readEnv: readEnvString,
    },
    certificateSource: {
        type: z.enum(CERTIFICATE_SOURCES),
        default: 'disabled',
        description: 'Trusted-proxy client-certificate header contract: the RFC 9440 Client-Cert headers (standard) or the X-Forwarded-Tls-Client-Cert header (forwarded). ' +
            'Enabling a source asserts that the backend listener is reachable only through a proxy that removes or overwrites the selected headers.',
        env: ConfigEnvironmentVariableName.CERTIFICATE_SOURCE,
        readEnv: readEnvString,
    },
    trustProxy: {
        type: z.union([
            z.boolean(),
            z.number().int().nonnegative(),
            // scalar strings are canonicalized in normalizeConfig
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
        env: ConfigEnvironmentVariableName.TRUST_PROXY,
        readEnv: readEnvRaw,
    },
    trustedOrigins: {
        type: z.array(z.string().refine((value) => {
            try {
                expandToOrigins(value);
                return true;
            } catch {
                return false;
            }
        }, 'must be a http(s) origin or a bare host[:port]')),
        default: [],
        description: 'Trusted first-party app origins besides publicUrl, used as redirect targets for the per-realm public system clients; entries are http(s) origins or bare hosts (a bare host expands to its http and https origin) and do not drive CORS. ' +
            'SECURITY: the system clients auto-consent with the global scope, so every origin listed here can obtain a full-permission user token in every realm.',
        path: 'trustedOrigins',
        env: ConfigEnvironmentVariableName.TRUSTED_ORIGINS,
        readEnv: readEnvArray,
    },

    middlewareBody: {
        type: middlewareType,
        default: true,
        description: 'Enable the body-parsing middleware, or pass its options.',
    },
    middlewareCors: {
        type: middlewareType,
        default: true,
        description: 'Enable the CORS middleware, or pass its options.',
    },
    middlewareCookie: {
        type: middlewareType,
        default: true,
        description: 'Enable the cookie-parsing middleware, or pass its options.',
    },
    middlewarePrometheus: {
        type: middlewareType,
        default: true,
        description: 'Enable the Prometheus metrics middleware, or pass its options.',
    },
    middlewareQuery: {
        type: middlewareType,
        default: true,
        description: 'Enable the query-parsing middleware, or pass its options.',
    },
    middlewareRateLimit: {
        type: middlewareType,
        default: true,
        description: 'Enable the rate-limit middleware, or pass its options.',
    },
    middlewareSwagger: {
        type: booleanType,
        default: true,
        description: 'Serve the Swagger UI and the OpenAPI document.',
    },

    tokenRefreshMaxAge: {
        type: nonNegativeNumberType,
        default: 259_200,
        description: 'Refresh token validity in seconds.',
        env: ConfigEnvironmentVariableName.TOKEN_REFRESH_MAX_AGE,
        readEnv: readEnvInt,
    },
    tokenAccessMaxAge: {
        type: nonNegativeNumberType,
        default: 900,
        description: 'Access token validity in seconds.',
        env: ConfigEnvironmentVariableName.TOKEN_ACCESS_MAX_AGE,
        readEnv: readEnvInt,
    },
    tokenRefreshGracePeriod: {
        type: nonNegativeNumberType,
        default: 0,
        description: 'Grace period in seconds during which a just-rotated refresh token is still accepted, minting new chain-linked tokens instead of triggering replay detection. Absorbs multi-tab and mobile refresh races; zero is strict (first use wins).',
        env: ConfigEnvironmentVariableName.TOKEN_REFRESH_GRACE_PERIOD,
        readEnv: readEnvInt,
    },
    promptLoginMaxAge: {
        type: nonNegativeNumberType,
        default: 60,
        description: 'Max age in seconds of the authentication a prompt=login or max_age authorize request accepts before forcing re-authentication, judged against the session creation time.',
        env: ConfigEnvironmentVariableName.PROMPT_LOGIN_MAX_AGE,
        readEnv: readEnvInt,
    },
    endSessionHintGracePeriod: {
        type: nonNegativeNumberType,
        default: 0,
        description: 'Seconds past its expiry an expired id_token_hint presented at the RP-initiated logout endpoint is still accepted for a server-side session revoke. Zero accepts any expired hint; beyond the window the click-gated confirm page still works.',
        env: ConfigEnvironmentVariableName.END_SESSION_HINT_GRACE_PERIOD,
        readEnv: readEnvInt,
    },

    registrationEnabled: {
        type: booleanType,
        default: false,
        description: 'Enable user self-registration.',
        env: ConfigEnvironmentVariableName.REGISTRATION_ENABLED,
        readEnv: readEnvBool,
    },
    emailVerificationEnabled: {
        type: booleanType,
        default: false,
        description: 'Require email verification for registration or login.',
        env: ConfigEnvironmentVariableName.EMAIL_VERIFICATION_ENABLED,
        readEnv: readEnvBool,
    },
    passwordRecoveryEnabled: {
        type: booleanType,
        default: false,
        description: 'Allow password reset via email.',
        env: ConfigEnvironmentVariableName.PASSWORD_RECOVERY_ENABLED,
        readEnv: readEnvBool,
    },
    passwordMinLength: {
        type: z.number().int().positive().max(USER_PASSWORD_MAX_LENGTH),
        default: USER_PASSWORD_MIN_LENGTH,
        description: 'Minimum length for user-chosen passwords (user create and update, registration, password reset). The maximum is fixed at 512.',
        env: ConfigEnvironmentVariableName.PASSWORD_MIN_LENGTH,
        readEnv: readEnvInt,
    },
    accountConsoleEnabled: {
        type: booleanType,
        default: true,
        description: 'Serve the account self-service console at /console/account (profile, password, authenticators, sessions, applications). Operators with their own self-service portal can disable it.',
        path: 'server.accountConsole.enabled',
        env: ConfigEnvironmentVariableName.ACCOUNT_CONSOLE_ENABLED,
        readEnv: readEnvBool,
    },
    adminConsoleEnabled: {
        type: booleanType,
        default: true,
        description: 'Serve the admin console at /console/admin. Off, the route answers with the disabled notice; a standalone-hosted console is unaffected.',
        path: 'server.adminConsole.enabled',
        env: ConfigEnvironmentVariableName.ADMIN_CONSOLE_ENABLED,
        readEnv: readEnvBool,
    },

    eventLogEnabled: {
        type: booleanType,
        default: true,
        description: 'Persist security audit events (login, authorize, replay detection) to the auth_events table. When disabled only the structured log line is emitted.',
        env: ConfigEnvironmentVariableName.EVENT_LOG_ENABLED,
        readEnv: readEnvBoolStrict,
    },
    eventLogRetentionDays: {
        type: nonNegativeNumberType,
        default: EVENT_LOG_RETENTION_DAYS_DEFAULT,
        description: 'Per-row retention for persisted audit events in days, stamped at write time and swept by the event cleaner. Zero keeps rows forever.',
        env: ConfigEnvironmentVariableName.EVENT_LOG_RETENTION_DAYS,
        readEnv: readEnvInt,
    },
    eventLogEntityEnabled: {
        type: booleanType,
        default: true,
        description: 'Additionally mirror every entity create, update and delete published on the domain-event bus into the auth_events table. Only effective while eventLogEnabled is true.',
        env: ConfigEnvironmentVariableName.EVENT_LOG_ENTITY_ENABLED,
        readEnv: readEnvBoolStrict,
    },
    eventLogEntityRetentionDays: {
        type: nonNegativeNumberType,
        default: 7,
        description: 'Per-row retention for entity-CRUD audit events in days, deliberately short so entity churn self-prunes. Zero keeps rows forever.',
        env: ConfigEnvironmentVariableName.EVENT_LOG_ENTITY_RETENTION_DAYS,
        readEnv: readEnvInt,
    },
    loginAttemptThrottleEnabled: {
        type: booleanType,
        default: false,
        description: 'Throttle failed interactive logins per (identifier, ip) pair by counting recent loginFailed audit events. Requires eventLogEnabled.',
        env: ConfigEnvironmentVariableName.LOGIN_ATTEMPT_THROTTLE_ENABLED,
        readEnv: readEnvBoolStrict,
    },
    loginAttemptThreshold: {
        type: positiveIntegerType,
        default: 5,
        description: 'Failed attempts per (identifier, ip) pair within the window before the pair is throttled.',
        env: ConfigEnvironmentVariableName.LOGIN_ATTEMPT_THRESHOLD,
        readEnv: readEnvInt,
    },
    loginAttemptWindow: {
        type: positiveIntegerType,
        default: 900,
        description: 'Sliding login-throttle window in seconds.',
        env: ConfigEnvironmentVariableName.LOGIN_ATTEMPT_WINDOW,
        readEnv: readEnvInt,
    },

    secretsEncryptionKey: {
        // '' = unset; otherwise a base64 string (normalizeConfig enforces
        // the decoded 32-byte length at boot).
        type: z.union([z.literal(''), z.base64()]),
        default: '',
        description: 'Optional base64-encoded 32-byte key (AES-256-GCM) wrapping the realm key store material at rest; an empty value leaves the material unwrapped (Keycloak and authentik parity). ' +
            'SECURITY: setting it later wraps rows lazily on read, and removing it while wrapped rows exist fails loud at first use.',
        env: ConfigEnvironmentVariableName.SECRETS_ENCRYPTION_KEY,
        readEnv: readEnvString,
    },

    mfaEnabled: {
        type: booleanType,
        default: false,
        description: 'Multi-factor authentication feature toggle. When enabled, users can enroll authenticator devices, and a user holding a confirmed device must present a second factor on interactive authorization and the password grant.',
        env: ConfigEnvironmentVariableName.MFA_ENABLED,
        readEnv: readEnvBoolStrict,
    },
    mfaRequired: {
        type: booleanType,
        default: false,
        description: 'Enforce MFA for every user: a user without a confirmed device is routed to inline enrollment at the next interactive login. Requires mfaEnabled.',
        env: ConfigEnvironmentVariableName.MFA_REQUIRED,
        readEnv: readEnvBoolStrict,
    },
    mfaFreshnessMaxAge: {
        type: nonNegativeNumberType,
        default: 60,
        description: 'Max age in seconds of the session second-factor proof an acr_values=urn:authup:mfa step-up request accepts before forcing a fresh challenge. The window absorbs the hosted challenge round-trip.',
        env: ConfigEnvironmentVariableName.MFA_FRESHNESS_MAX_AGE,
        readEnv: readEnvInt,
    },
    mfaTicketMaxAge: {
        type: positiveIntegerType,
        default: 600,
        description: 'Lifetime in seconds of the MFA-pending login ticket the password grant issues when the second factor cannot ride the single POST (email, WebAuthn), and of the pending session backing it. Sized to cover the email OTP window.',
        env: ConfigEnvironmentVariableName.MFA_TICKET_MAX_AGE,
        readEnv: readEnvInt,
    },

    clientAuthBasic: {
        type: booleanType,
        default: false,
        description: 'Accept HTTP Basic authentication with client credentials on the management API.',
        env: ConfigEnvironmentVariableName.CLIENT_AUTH_BASIC,
        readEnv: readEnvBool,
    },
    clientSystemEnabled: {
        type: booleanType,
        default: false,
        description: 'Provision the system client in the master realm.',
        env: ConfigEnvironmentVariableName.CLIENT_SYSTEM_ENABLED,
        readEnv: readEnvBool,
    },
    clientSystemSecret: {
        type: secretType,
        default: 'start123',
        description: 'Secret of the system client.',
        env: ConfigEnvironmentVariableName.CLIENT_SYSTEM_SECRET,
        readEnv: readEnvString,
    },
    clientSystemSecretReset: {
        type: booleanType,
        default: false,
        description: 'Reset the system client secret on application startup.',
        env: ConfigEnvironmentVariableName.CLIENT_SYSTEM_SECRET_RESET,
        readEnv: readEnvBool,
    },

    userAuthBasic: {
        type: booleanType,
        default: false,
        description: 'Accept HTTP Basic authentication with user credentials on the management API.',
        env: ConfigEnvironmentVariableName.USER_AUTH_BASIC,
        readEnv: readEnvBool,
    },
    userAdminEnabled: {
        type: booleanType,
        default: true,
        description: 'Provision the default admin user.',
        env: ConfigEnvironmentVariableName.USER_ADMIN_ENABLED,
        readEnv: readEnvBool,
    },
    userAdminPassword: {
        type: secretType,
        default: 'start123',
        description: 'Password of the default admin user.',
        env: ConfigEnvironmentVariableName.USER_ADMIN_PASSWORD,
        readEnv: readEnvString,
    },
    userAdminPasswordReset: {
        type: booleanType,
        default: false,
        description: 'Reset the admin password on application startup.',
        env: ConfigEnvironmentVariableName.USER_ADMIN_PASSWORD_RESET,
        readEnv: readEnvBool,
    },

    permissions: {
        type: z.string().or(z.array(z.string())),
        default: [],
        description: 'Additional permission names to provision, as a list or a comma-separated string.',
        env: ConfigEnvironmentVariableName.PERMISSIONS,
        readEnv: readEnvArray,
    },
    permissionsDefaultPolicyAssignment: {
        type: booleanType,
        default: true,
        description: 'Auto-assign the system.default policy to new permissions without policies. Deprecated, to be removed in v2.0.0: external systems should assign policies explicitly.',
        env: ConfigEnvironmentVariableName.PERMISSIONS_DEFAULT_POLICY_ASSIGNMENT,
        readEnv: readEnvBool,
    },
};
