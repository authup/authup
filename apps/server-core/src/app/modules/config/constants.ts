/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TypedToken } from 'eldin';
import type { Config } from './types.ts';

export const ConfigInjectionKey = new TypedToken<Config>('Config');

/**
 * The section of `authup.yml` this service reads. Every registry entry that
 * declares no `path` of its own lives under it, so the deployment-wide keys
 * (`db`, `redis`, `smtp`) and every entry taken from
 * `@authup/server-config-base` are exactly the ones that spell a path out.
 */
export const CONFIG_SECTION = 'server.core';

/**
 * The one file the configuration is read from, and the extensions it may
 * carry. `conf` is deliberately absent: the `authup.conf` family was retired
 * in favour of a single `authup.yml` (plan 101 stage C).
 */
export const CONFIG_FILE_NAME = 'authup';
export const CONFIG_FILE_EXTENSIONS = ['yml', 'yaml', 'json', 'js', 'mjs', 'cjs', 'ts', 'mts'];

/**
 * The environment variable names of the keys THIS package declares. The
 * shared ones live with their declarations, in
 * `BaseConfigEnvironmentVariableName`, and the registry unions the two.
 */
export enum ConfigEnvironmentVariableName {
    NODE_ENV = 'NODE_ENV',
    WRITABLE_DIRECTORY_PATH = 'WRITABLE_DIRECTORY_PATH',

    REDIS = 'REDIS',
    SMTP = 'SMTP',

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
}
