/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * The environment variable names of the shared keys.
 *
 * Declared alongside them rather than in each consumer's own enum: a string
 * enum is nominally typed, so a package narrowing its registry to its own
 * enum cannot accept a plain string literal from here. A consumer unions
 * this with its own instead, which also means the shared names cannot be
 * respelled on one side.
 */
export enum BaseConfigEnvironmentVariableName {
    PUBLIC_URL = 'PUBLIC_URL',
    TRUSTED_ORIGINS = 'TRUSTED_ORIGINS',
    THEME_DIRECTORY_PATH = 'THEME_DIRECTORY_PATH',
    THEME_FRAGMENTS_ENABLED = 'THEME_FRAGMENTS_ENABLED',
    AUTH_CONSOLE_URL = 'AUTH_CONSOLE_URL',
    ACCOUNT_CONSOLE_URL = 'ACCOUNT_CONSOLE_URL',
    ADMIN_CONSOLE_URL = 'ADMIN_CONSOLE_URL',
    ACCOUNT_CONSOLE_ENABLED = 'ACCOUNT_CONSOLE_ENABLED',
    ADMIN_CONSOLE_ENABLED = 'ADMIN_CONSOLE_ENABLED',
}
