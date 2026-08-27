/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ConfigSchema } from '@authup/server-config-kit';
import { readEnvBool, readEnvInt, readEnvString } from '@authup/server-config-kit';
import { z } from 'zod';
import { EnvironmentVariable } from '../../constants.ts';
import { urlOrEmpty } from '../../utils.ts';
import type { AccountConsoleSectionConfig } from './types.ts';

export const ACCOUNT_CONSOLE_CONFIG_SECTION = 'server.accountConsole';

export const ACCOUNT_CONSOLE_SECTION_CONFIG_SCHEMA = {
    accountConsoleUrl: {
        type: urlOrEmpty,
        default: '',
        description: 'Where the account console service (@authup/server-account-console) is served, e.g. https://example.com/console/account. ' +
            'The server-side login lands the browser there once the session credential is issued. An empty value derives it from publicUrl, which is the single-origin default.',
        path: 'server.accountConsole.url',
        env: EnvironmentVariable.ACCOUNT_CONSOLE_URL,
        readEnv: readEnvString,
    },
    accountConsoleEnabled: {
        type: z.boolean(),
        default: true,
        description: 'Serve the account self-service console at /console/account (profile, password, authenticators, sessions, applications). Operators with their own self-service portal can disable it.',
        path: 'server.accountConsole.enabled',
        env: EnvironmentVariable.ACCOUNT_CONSOLE_ENABLED,
        readEnv: readEnvBool,
    },
    accountConsolePath: {
        type: z.string(),
        default: '',
        description: 'Package directory of a substituted @authup/client-account-console, consulted before the node_modules resolution walk; an empty value resolves the package from node_modules.',
        path: 'server.accountConsole.path',
        env: EnvironmentVariable.ACCOUNT_CONSOLE_PATH,
        readEnv: readEnvString,
    },
    accountConsolePort: {
        type: z.number().nonnegative(),
        default: 3022,
        description: 'TCP port the HTTP listener binds.',
        path: 'server.accountConsole.port',
        env: EnvironmentVariable.ACCOUNT_CONSOLE_PORT,
        readEnv: readEnvInt,
    },
    accountConsoleHost: {
        type: z.string(),
        default: '',
        description: 'Host address the HTTP listener binds; an empty value leaves the runtime default.',
        path: 'server.accountConsole.host',
        env: EnvironmentVariable.ACCOUNT_CONSOLE_HOST,
        readEnv: readEnvString,
    },
} satisfies ConfigSchema<AccountConsoleSectionConfig, never, EnvironmentVariable>;
