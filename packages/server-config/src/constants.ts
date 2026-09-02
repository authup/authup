/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Every environment variable `authup.yml` has a counterpart for, in ONE enum.
 *
 * A string enum is nominally typed, so a service narrowing its registry to its
 * own enum could not accept a plain string literal from anywhere else. Since
 * every key is declared in this package, one enum is also the complete list:
 * a name that appears here and nowhere in a schema is a leftover, and a name a
 * schema spells without an entry here fails the build.
 *
 * The names are the operator-facing contract and never change with a
 * refactor.
 */
export enum EnvironmentVariable {
    // deployment
    NODE_ENV = 'NODE_ENV',
    PUBLIC_URL = 'PUBLIC_URL',
    TRUSTED_ORIGINS = 'TRUSTED_ORIGINS',
    REDIS = 'REDIS',
    SMTP = 'SMTP',

    // theme
    THEME_DIRECTORY_PATH = 'THEME_DIRECTORY_PATH',
    THEME_FRAGMENTS_ENABLED = 'THEME_FRAGMENTS_ENABLED',

    // core
    WRITABLE_DIRECTORY_PATH = 'WRITABLE_DIRECTORY_PATH',

    COMPONENTS_ENABLED = 'COMPONENTS_ENABLED',
    MIGRATION_ENABLED = 'MIGRATION_ENABLED',

    HOST = 'HOST',
    PORT = 'PORT',
    MTLS_PUBLIC_URL = 'MTLS_PUBLIC_URL',
    CERTIFICATE_SOURCE = 'CERTIFICATE_SOURCE',
    TRUST_PROXY = 'TRUST_PROXY',
    TOKEN_ACCESS_MAX_AGE = 'TOKEN_ACCESS_MAX_AGE',
    TOKEN_REFRESH_MAX_AGE = 'TOKEN_REFRESH_MAX_AGE',
    TOKEN_REFRESH_GRACE_PERIOD = 'TOKEN_REFRESH_GRACE_PERIOD',
    PROMPT_LOGIN_MAX_AGE = 'PROMPT_LOGIN_MAX_AGE',
    END_SESSION_HINT_GRACE_PERIOD = 'END_SESSION_HINT_GRACE_PERIOD',
    REGISTRATION_ENABLED = 'REGISTRATION_ENABLED',
    EMAIL_VERIFICATION_ENABLED = 'EMAIL_VERIFICATION_ENABLED',
    PASSWORD_RECOVERY_ENABLED = 'PASSWORD_RECOVERY_ENABLED',
    PASSWORD_MIN_LENGTH = 'PASSWORD_MIN_LENGTH',

    EVENT_LOG_ENABLED = 'EVENT_LOG_ENABLED',
    EVENT_LOG_RETENTION_DAYS = 'EVENT_LOG_RETENTION_DAYS',
    EVENT_LOG_ENTITY_ENABLED = 'EVENT_LOG_ENTITY_ENABLED',
    EVENT_LOG_ENTITY_RETENTION_DAYS = 'EVENT_LOG_ENTITY_RETENTION_DAYS',
    LOGIN_ATTEMPT_THROTTLE_ENABLED = 'LOGIN_ATTEMPT_THROTTLE_ENABLED',
    LOGIN_ATTEMPT_THRESHOLD = 'LOGIN_ATTEMPT_THRESHOLD',
    LOGIN_ATTEMPT_WINDOW = 'LOGIN_ATTEMPT_WINDOW',

    SECRETS_ENCRYPTION_KEY = 'SECRETS_ENCRYPTION_KEY',

    MFA_ENABLED = 'MFA_ENABLED',
    MFA_REQUIRED = 'MFA_REQUIRED',
    MFA_FRESHNESS_MAX_AGE = 'MFA_FRESHNESS_MAX_AGE',
    MFA_TICKET_MAX_AGE = 'MFA_TICKET_MAX_AGE',

    CLIENT_AUTH_BASIC = 'CLIENT_AUTH_BASIC',
    CLIENT_SYSTEM_ENABLED = 'CLIENT_SYSTEM_ENABLED',
    CLIENT_SYSTEM_SECRET = 'CLIENT_SYSTEM_SECRET',
    CLIENT_SYSTEM_SECRET_RESET = 'CLIENT_SYSTEM_SECRET_RESET',

    USER_AUTH_BASIC = 'USER_AUTH_BASIC',
    USER_ADMIN_ENABLED = 'USER_ADMIN_ENABLED',
    USER_ADMIN_PASSWORD = 'USER_ADMIN_PASSWORD',
    USER_ADMIN_PASSWORD_RESET = 'USER_ADMIN_PASSWORD_RESET',

    PERMISSIONS = 'PERMISSIONS',
    PERMISSIONS_DEFAULT_POLICY_ASSIGNMENT = 'PERMISSIONS_DEFAULT_POLICY_ASSIGNMENT',

    // authConsole
    AUTH_CONSOLE_URL = 'AUTH_CONSOLE_URL',
    AUTH_CONSOLE_PATH = 'AUTH_CONSOLE_PATH',
    AUTH_CONSOLE_PORT = 'AUTH_CONSOLE_PORT',
    AUTH_CONSOLE_HOST = 'AUTH_CONSOLE_HOST',

    // adminConsole
    ADMIN_CONSOLE_URL = 'ADMIN_CONSOLE_URL',
    ADMIN_CONSOLE_ENABLED = 'ADMIN_CONSOLE_ENABLED',
    ADMIN_CONSOLE_PATH = 'ADMIN_CONSOLE_PATH',
    ADMIN_CONSOLE_PORT = 'ADMIN_CONSOLE_PORT',
    ADMIN_CONSOLE_HOST = 'ADMIN_CONSOLE_HOST',

    // accountConsole
    ACCOUNT_CONSOLE_URL = 'ACCOUNT_CONSOLE_URL',
    ACCOUNT_CONSOLE_ENABLED = 'ACCOUNT_CONSOLE_ENABLED',
    ACCOUNT_CONSOLE_PATH = 'ACCOUNT_CONSOLE_PATH',
    ACCOUNT_CONSOLE_PORT = 'ACCOUNT_CONSOLE_PORT',
    ACCOUNT_CONSOLE_HOST = 'ACCOUNT_CONSOLE_HOST',
}

export enum SECTION_KEY {
    ACCOUNT_CONSOLE = 'accountConsole',
    ADMIN_CONSOLE = 'adminConsole',
    AUTH_CONSOLE = 'authConsole',
    CORE = 'core',
    THEME = 'theme',
}

/**
 * The one file the configuration is read from, and the extensions it may
 * carry. `conf` is deliberately absent: the `authup.conf` family was retired
 * in favour of a single `authup.yml` (plan 101 stage C).
 */
export const FILE_NAME = 'authup';
export const FILE_EXTENSIONS = ['yml', 'yaml', 'json', 'js', 'mjs', 'cjs', 'ts', 'mts'];

/**
 * The deployment-wide bind address, at the root of the document.
 *
 * Every listener's own `host` key falls back to it, so an operator running
 * the API and the three console services binds them all with one line. `port`
 * deliberately has no counterpart: three listeners cannot share one.
 */
export const DEFAULT_HOST_PATH = 'host';
