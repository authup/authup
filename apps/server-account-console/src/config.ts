/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ConfigSchema } from '@authup/server-config-kit';
import { BASE_CONFIG_SCHEMA } from '@authup/server-config-base';
import {
    buildSchemaDefaults,
    readEnvInt,
    readEnvString,
    readSchemaFromEnv,
} from '@authup/server-config-kit';
import { z } from 'zod';
import { ACCOUNT_CONSOLE_BASE_PATH } from './constants';
import type { AccountConsoleConfig, AccountConsoleConfigInput } from './types';

/**
 * The section of `authup.yml` this service's own keys live under. Keys it
 * SHARES with server-core (publicUrl, trustedOrigins, the theme pair) declare
 * an absolute path of their own instead, and their entries below are copies
 * of server-core's: `composeSchemas` refuses a key two registries declare
 * with a disagreeing path, environment variable or default, because the two
 * would then read one configuration key differently.
 */
export const ACCOUNT_CONSOLE_CONFIG_SECTION = 'server.accountConsole';

export const ACCOUNT_CONSOLE_CONFIG_SCHEMA = {
    publicUrl: BASE_CONFIG_SCHEMA.publicUrl,
    accountConsoleUrl: BASE_CONFIG_SCHEMA.accountConsoleUrl,
    accountConsoleEnabled: BASE_CONFIG_SCHEMA.accountConsoleEnabled,
    trustedOrigins: BASE_CONFIG_SCHEMA.trustedOrigins,
    themeDirectoryPath: BASE_CONFIG_SCHEMA.themeDirectoryPath,
    themeFragmentsEnabled: BASE_CONFIG_SCHEMA.themeFragmentsEnabled,
    accountConsolePort: {
        type: z.number().nonnegative(),
        default: 3022,
        description: 'TCP port the HTTP listener binds.',
        path: 'server.accountConsole.port',
        env: 'ACCOUNT_CONSOLE_PORT',
        readEnv: readEnvInt,
    },
    accountConsoleHost: {
        type: z.string(),
        default: '',
        description: 'Host address the HTTP listener binds; an empty value leaves the runtime default.',
        path: 'server.accountConsole.host',
        env: 'ACCOUNT_CONSOLE_HOST',
        readEnv: readEnvString,
    },
    accountConsolePath: {
        type: z.string(),
        default: '',
        description: 'Package directory of a substituted @authup/client-account-console, consulted before the node_modules resolution walk; an empty value resolves the package from node_modules.',
        path: 'server.accountConsole.path',
        env: 'ACCOUNT_CONSOLE_PATH',
        readEnv: readEnvString,
    },
} satisfies ConfigSchema<AccountConsoleConfigInput, 'publicUrl'>;

/**
 * Turn the configuration namespace into the service's own shape: fill the
 * defaults, derive the one key that is derived rather than configured, and
 * rename. An empty `accountConsoleUrl` means the console sits on
 * server-core's own origin under the default segment, which is the
 * single-origin deployment.
 */
export function resolveAccountConsoleConfig(
    input: Partial<AccountConsoleConfigInput>,
) : AccountConsoleConfig {
    const values = {
        ...buildSchemaDefaults<AccountConsoleConfigInput>(ACCOUNT_CONSOLE_CONFIG_SCHEMA),
        ...input,
    } as AccountConsoleConfigInput;

    if (!values.publicUrl) {
        throw new Error(
            'The account console service needs the public URL of server-core. Set PUBLIC_URL.',
        );
    }

    return {
        url: values.accountConsoleUrl ||
            `${values.publicUrl.replace(/\/+$/, '')}${ACCOUNT_CONSOLE_BASE_PATH}`,
        apiUrl: values.publicUrl,
        enabled: values.accountConsoleEnabled,
        port: values.accountConsolePort,
        host: values.accountConsoleHost,
        distPath: values.accountConsolePath,
        trustedOrigins: values.trustedOrigins,
        themeDirectoryPath: values.themeDirectoryPath,
        themeFragmentsEnabled: values.themeFragmentsEnabled,
    };
}

/**
 * The standalone entry's configuration, read from the environment alone.
 * `authup.yml` reaches this service through the CLI roles, which compose this
 * very registry into the one document loader.
 */
export function readAccountConsoleConfigFromEnv() : AccountConsoleConfig {
    // The explicit type argument is load-bearing: inferred from the schema
    // object, a key declared without a default (the derived publicUrl) comes
    // back as unknown.
    const input : Partial<AccountConsoleConfigInput> = readSchemaFromEnv<AccountConsoleConfigInput>(
        ACCOUNT_CONSOLE_CONFIG_SCHEMA,
    );

    return resolveAccountConsoleConfig(input);
}
