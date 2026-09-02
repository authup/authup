/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { USER_PASSWORD_MAX_LENGTH, USER_PASSWORD_MIN_LENGTH } from '@authup/core-kit';
import {
    defineSchema,
    readEnvArray,
    readEnvBool,
    readEnvBoolStrict,
    readEnvInt,
    readEnvRaw,
    readEnvString,
} from '@authup/server-config-kit';
import { z } from 'zod';
import { resolveRootRelativePath } from '../../helpers/index.ts';
import { assertSecretsEncryptionKey } from './secrets-encryption-key.ts';
import { canonicalizeTrustProxyValue } from './trust-proxy-canonicalize.ts';
import { EnvironmentVariable } from '../../constants.ts';
import { CERTIFICATE_SOURCES, EVENT_LOG_RETENTION_DAYS_DEFAULT } from './constants.ts';
import { isValidTrustProxyListEntry } from './trust-proxy.ts';
import type { CoreConfig, CoreWorkerConfig, MiddlewareOptions } from './types.ts';

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
 * The `core.*` section: the API and IdP service's own keys.
 *
 * An entry declares no location of its own derives
 * it from the section and the key name, so a key cannot end up at a path this
 * section does not own. `host` reaches outside it only through `alt`, the
 * deployment-wide declaration it falls back to.
 */
export const CORE_SCHEMA = defineSchema<CoreConfig, never, EnvironmentVariable>(
    {
        writableDirectoryPath: {
            type: stringType,
            default: 'writable',
            description: 'Directory the application writes to at runtime (production log files) and reads file-based provisioning from. ' +
            'The SQLite database is not placed here; a relative path resolves against rootPath.',
            env: EnvironmentVariable.WRITABLE_DIRECTORY_PATH,
            readEnv: readEnvString,
            // Relative to `rootPath`, so one document means the same directory
            // to every service it configures, whichever process cwd each was
            // started from.
            resolve: ({ value, get }) => resolveRootRelativePath(value as string, get('rootPath') as string),
        },

        logger: {
            type: booleanType,
            default: true,
            description: 'Enable the application logger.',
        },

        worker: defineSchema<CoreWorkerConfig, never, EnvironmentVariable>({
            enabled: {
                type: booleanType,
                default: true,
                description: 'Run the worker (the background cron sweeps) in this process. Under the default mode the API runs it alongside itself; set false on API replicas when a dedicated `authup start --worker` process runs it. Worker mode refuses to start when this is false.',
                env: EnvironmentVariable.WORKER_ENABLED,
                readEnv: readEnvBoolStrict,
            },
        }, { pathPrefix: 'core.worker' }),
        migrationEnabled: {
            type: booleanType,
            default: true,
            description: 'Apply pending schema migrations at startup. When false, startup runs no DDL and fails loud when migrations are pending; the migration CLI command is unaffected and sqlite always synchronizes.',
            env: EnvironmentVariable.MIGRATION_ENABLED,
            readEnv: readEnvBoolStrict,
        },

        port: {
            type: nonNegativeNumberType,
            default: 3000,
            description: 'TCP port the HTTP listener binds.',
            env: EnvironmentVariable.PORT,
            readEnv: readEnvInt,
        },
        host: {
            type: stringType,
            // '' means unset, which is what makes the inheritance below
            // reachable: a real default would BE the value, and the
            // deployment-wide one could never reach this listener.
            default: '',
            description: 'Host address the HTTP listener binds. Inherits the deployment-wide `host` (HOST) unless it names its own.',
            resolve: ({ value, get }) => (value as string) || get('host') as string,
        },
        mtlsPublicUrl: {
            type: z.url().nullable(),
            default: null,
            description: 'Optional externally reachable base URL dedicated to endpoints that request TLS client certificates, published as RFC 8705 mTLS endpoint aliases. The reverse proxy may route it to the same backend listener.',
            env: EnvironmentVariable.MTLS_PUBLIC_URL,
            readEnv: readEnvString,
            // The mTLS alias is only meaningful once a certificate source is
            // configured; without one the listener would advertise an address
            // no evidence can ever arrive on.
            resolve: ({ value, get }) => {
                if (value && get('core.certificateSource') === 'disabled') {
                    throw new Error('mtlsPublicUrl requires certificateSource to be enabled.');
                }

                return value as string | null;
            },
        },
        certificateSource: {
            type: z.enum(CERTIFICATE_SOURCES),
            default: 'disabled',
            description: 'Trusted-proxy client-certificate header contract: the RFC 9440 Client-Cert headers (standard) or the X-Forwarded-Tls-Client-Cert header (forwarded). ' +
            'Enabling a source asserts that the backend listener is reachable only through a proxy that removes or overwrites the selected headers.',
            env: EnvironmentVariable.CERTIFICATE_SOURCE,
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
            env: EnvironmentVariable.TRUST_PROXY,
            readEnv: readEnvRaw,
            // Canonicalized where it is declared, so every surface reading it
            // (the app options, and therefore every proxy-dependent request
            // helper) sees the same shape whichever config surface set it.
            resolve: ({ value }) => canonicalizeTrustProxyValue(value as MiddlewareOptions),
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
        // a plain boolean, unlike its siblings: the Swagger mount takes no
        // options today, and widening it would start accepting a document
        // shape nothing reads.
            type: booleanType as z.ZodType<MiddlewareOptions>,
            default: true,
            description: 'Serve the Swagger UI and the OpenAPI document.',
        },

        tokenRefreshMaxAge: {
            type: nonNegativeNumberType,
            default: 259_200,
            description: 'Refresh token validity in seconds.',
            env: EnvironmentVariable.TOKEN_REFRESH_MAX_AGE,
            readEnv: readEnvInt,
        },
        tokenAccessMaxAge: {
            type: nonNegativeNumberType,
            default: 900,
            description: 'Access token validity in seconds.',
            env: EnvironmentVariable.TOKEN_ACCESS_MAX_AGE,
            readEnv: readEnvInt,
        },
        tokenRefreshGracePeriod: {
            type: nonNegativeNumberType,
            default: 0,
            description: 'Grace period in seconds during which a just-rotated refresh token is still accepted, minting new chain-linked tokens instead of triggering replay detection. Absorbs multi-tab and mobile refresh races; zero is strict (first use wins).',
            env: EnvironmentVariable.TOKEN_REFRESH_GRACE_PERIOD,
            readEnv: readEnvInt,
        },
        promptLoginMaxAge: {
            type: nonNegativeNumberType,
            default: 60,
            description: 'Max age in seconds of the authentication a prompt=login or max_age authorize request accepts before forcing re-authentication, judged against the session creation time.',
            env: EnvironmentVariable.PROMPT_LOGIN_MAX_AGE,
            readEnv: readEnvInt,
        },
        endSessionHintGracePeriod: {
            type: nonNegativeNumberType,
            default: 0,
            description: 'Seconds past its expiry an expired id_token_hint presented at the RP-initiated logout endpoint is still accepted for a server-side session revoke. Zero accepts any expired hint; beyond the window the click-gated confirm page still works.',
            env: EnvironmentVariable.END_SESSION_HINT_GRACE_PERIOD,
            readEnv: readEnvInt,
        },

        registrationEnabled: {
            type: booleanType,
            default: false,
            description: 'Enable user self-registration.',
            env: EnvironmentVariable.REGISTRATION_ENABLED,
            readEnv: readEnvBool,
        },
        emailVerificationEnabled: {
            type: booleanType,
            default: false,
            description: 'Require email verification for registration or login.',
            env: EnvironmentVariable.EMAIL_VERIFICATION_ENABLED,
            readEnv: readEnvBool,
        },
        passwordRecoveryEnabled: {
            type: booleanType,
            default: false,
            description: 'Allow password reset via email.',
            env: EnvironmentVariable.PASSWORD_RECOVERY_ENABLED,
            readEnv: readEnvBool,
        },
        passwordMinLength: {
            type: z.number().int().positive().max(USER_PASSWORD_MAX_LENGTH),
            default: USER_PASSWORD_MIN_LENGTH,
            description: 'Minimum length for user-chosen passwords (user create and update, registration, password reset). The maximum is fixed at 512.',
            env: EnvironmentVariable.PASSWORD_MIN_LENGTH,
            readEnv: readEnvInt,
        },

        eventLogEnabled: {
            type: booleanType,
            default: true,
            description: 'Persist security audit events (login, authorize, replay detection) to the auth_events table. When disabled only the structured log line is emitted.',
            env: EnvironmentVariable.EVENT_LOG_ENABLED,
            readEnv: readEnvBoolStrict,
        },
        eventLogRetentionDays: {
            type: nonNegativeNumberType,
            default: EVENT_LOG_RETENTION_DAYS_DEFAULT,
            description: 'Per-row retention for persisted audit events in days, stamped at write time and swept by the event cleaner. Zero keeps rows forever.',
            env: EnvironmentVariable.EVENT_LOG_RETENTION_DAYS,
            readEnv: readEnvInt,
        },
        eventLogEntityEnabled: {
            type: booleanType,
            default: true,
            description: 'Additionally mirror every entity create, update and delete published on the domain-event bus into the auth_events table. Only effective while eventLogEnabled is true.',
            env: EnvironmentVariable.EVENT_LOG_ENTITY_ENABLED,
            readEnv: readEnvBoolStrict,
        },
        eventLogEntityRetentionDays: {
            type: nonNegativeNumberType,
            default: 7,
            description: 'Per-row retention for entity-CRUD audit events in days, deliberately short so entity churn self-prunes. Zero keeps rows forever.',
            env: EnvironmentVariable.EVENT_LOG_ENTITY_RETENTION_DAYS,
            readEnv: readEnvInt,
        },
        loginAttemptThrottleEnabled: {
            type: booleanType,
            default: false,
            description: 'Throttle failed interactive logins per (identifier, ip) pair by counting recent loginFailed audit events. Requires eventLogEnabled.',
            env: EnvironmentVariable.LOGIN_ATTEMPT_THROTTLE_ENABLED,
            readEnv: readEnvBoolStrict,
            // The throttle counts LOGIN_FAILED rows, so it is inert without the
            // event log. Declared here rather than in a normalization step,
            // because the rule belongs to the key it constrains.
            resolve: ({ value, get }) => {
                if (value && !get('core.eventLogEnabled')) {
                    throw new Error('loginAttemptThrottleEnabled requires eventLogEnabled.');
                }

                return value as boolean;
            },
        },
        loginAttemptThreshold: {
            type: positiveIntegerType,
            default: 5,
            description: 'Failed attempts per (identifier, ip) pair within the window before the pair is throttled.',
            env: EnvironmentVariable.LOGIN_ATTEMPT_THRESHOLD,
            readEnv: readEnvInt,
        },
        loginAttemptWindow: {
            type: positiveIntegerType,
            default: 900,
            description: 'Sliding login-throttle window in seconds.',
            env: EnvironmentVariable.LOGIN_ATTEMPT_WINDOW,
            readEnv: readEnvInt,
        },

        secretsEncryptionKey: {
        // '' = unset; otherwise a base64 string (the consuming service
        // enforces the decoded 32-byte length at boot).
            type: z.union([z.literal(''), z.base64()]),
            default: '',
            description: 'Optional base64-encoded 32-byte key (AES-256-GCM) wrapping the realm key store material at rest; an empty value leaves the material unwrapped (Keycloak and authentik parity). ' +
            'SECURITY: setting it later wraps rows lazily on read, and removing it while wrapped rows exist fails loud at first use.',
            env: EnvironmentVariable.SECRETS_ENCRYPTION_KEY,
            readEnv: readEnvString,
            // Validated where it is declared: a key that does not decode to 32
            // bytes is a boot failure, not a runtime surprise inside the
            // cipher.
            resolve: ({ value }) => {
                assertSecretsEncryptionKey(value as string);

                return value as string;
            },
        },

        mfaEnabled: {
            type: booleanType,
            default: false,
            description: 'Multi-factor authentication feature toggle. When enabled, users can enroll authenticator devices, and a user holding a confirmed device must present a second factor on interactive authorization and the password grant.',
            env: EnvironmentVariable.MFA_ENABLED,
            readEnv: readEnvBoolStrict,
        },
        mfaRequired: {
            type: booleanType,
            default: false,
            description: 'Enforce MFA for every user: a user without a confirmed device is routed to inline enrollment at the next interactive login. Requires mfaEnabled.',
            env: EnvironmentVariable.MFA_REQUIRED,
            readEnv: readEnvBoolStrict,
            resolve: ({ value, get }) => {
                if (value && !get('core.mfaEnabled')) {
                    throw new Error('mfaRequired requires mfaEnabled.');
                }

                return value as boolean;
            },
        },
        mfaFreshnessMaxAge: {
            type: nonNegativeNumberType,
            default: 60,
            description: 'Max age in seconds of the session second-factor proof an acr_values=urn:authup:mfa step-up request accepts before forcing a fresh challenge. The window absorbs the hosted challenge round-trip.',
            env: EnvironmentVariable.MFA_FRESHNESS_MAX_AGE,
            readEnv: readEnvInt,
        },
        mfaTicketMaxAge: {
            type: positiveIntegerType,
            default: 600,
            description: 'Lifetime in seconds of the MFA-pending login ticket the password grant issues when the second factor cannot ride the single POST (email, WebAuthn), and of the pending session backing it. Sized to cover the email OTP window.',
            env: EnvironmentVariable.MFA_TICKET_MAX_AGE,
            readEnv: readEnvInt,
        },

        clientAuthBasic: {
            type: booleanType,
            default: false,
            description: 'Accept HTTP Basic authentication with client credentials on the management API.',
            env: EnvironmentVariable.CLIENT_AUTH_BASIC,
            readEnv: readEnvBool,
        },
        clientSystemEnabled: {
            type: booleanType,
            default: false,
            description: 'Provision the system client in the master realm.',
            env: EnvironmentVariable.CLIENT_SYSTEM_ENABLED,
            readEnv: readEnvBool,
        },
        clientSystemSecret: {
            type: secretType,
            default: 'start123',
            description: 'Secret of the system client.',
            env: EnvironmentVariable.CLIENT_SYSTEM_SECRET,
            readEnv: readEnvString,
        },
        clientSystemSecretReset: {
            type: booleanType,
            default: false,
            description: 'Reset the system client secret on application startup.',
            env: EnvironmentVariable.CLIENT_SYSTEM_SECRET_RESET,
            readEnv: readEnvBool,
        },

        userAuthBasic: {
            type: booleanType,
            default: false,
            description: 'Accept HTTP Basic authentication with user credentials on the management API.',
            env: EnvironmentVariable.USER_AUTH_BASIC,
            readEnv: readEnvBool,
        },
        userAdminEnabled: {
            type: booleanType,
            default: true,
            description: 'Provision the default admin user.',
            env: EnvironmentVariable.USER_ADMIN_ENABLED,
            readEnv: readEnvBool,
        },
        userAdminPassword: {
            type: secretType,
            default: 'start123',
            description: 'Password of the default admin user.',
            env: EnvironmentVariable.USER_ADMIN_PASSWORD,
            readEnv: readEnvString,
        },
        userAdminPasswordReset: {
            type: booleanType,
            default: false,
            description: 'Reset the admin password on application startup.',
            env: EnvironmentVariable.USER_ADMIN_PASSWORD_RESET,
            readEnv: readEnvBool,
        },

        permissions: {
            type: z.string().or(z.array(z.string())),
            default: [],
            description: 'Additional permission names to provision, as a list or a comma-separated string.',
            env: EnvironmentVariable.PERMISSIONS,
            readEnv: readEnvArray,
        },
        permissionsDefaultPolicyAssignment: {
            type: booleanType,
            default: true,
            description: 'Auto-assign the system.default policy to new permissions without policies. Deprecated, to be removed in v2.0.0: external systems should assign policies explicitly.',
            env: EnvironmentVariable.PERMISSIONS_DEFAULT_POLICY_ASSIGNMENT,
            readEnv: readEnvBool,
        },
    },
    { pathPrefix: 'core' },
);
