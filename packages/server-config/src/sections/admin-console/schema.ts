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
import type { AdminConsoleSectionConfig } from './types.ts';

export const ADMIN_CONSOLE_CONFIG_SECTION = 'server.adminConsole';

export const ADMIN_CONSOLE_SECTION_CONFIG_SCHEMA = {
    adminConsoleUrl: {
        type: urlOrEmpty,
        default: '',
        description: 'Where the admin console service (@authup/server-admin-console) is served, e.g. https://example.com/console/admin. ' +
            'The server-side login lands the browser there once the session credential is issued. An empty value derives it from publicUrl, which is the single-origin default.',
        path: 'server.adminConsole.url',
        env: EnvironmentVariable.ADMIN_CONSOLE_URL,
        readEnv: readEnvString,
    },
    adminConsoleEnabled: {
        type: z.boolean(),
        default: true,
        description: 'Serve the admin console at /console/admin. Off, the console renders the disabled notice and its server-side login answers 404; a standalone-hosted console is unaffected.',
        path: 'server.adminConsole.enabled',
        env: EnvironmentVariable.ADMIN_CONSOLE_ENABLED,
        readEnv: readEnvBool,
    },
    adminConsolePath: {
        type: z.string(),
        default: '',
        description: 'Package directory of a substituted @authup/client-admin-console, consulted before the node_modules resolution walk; an empty value resolves the package from node_modules.',
        path: 'server.adminConsole.path',
        env: EnvironmentVariable.ADMIN_CONSOLE_PATH,
        readEnv: readEnvString,
    },
    adminConsolePort: {
        type: z.number().nonnegative(),
        default: 3021,
        description: 'TCP port the HTTP listener binds.',
        path: 'server.adminConsole.port',
        env: EnvironmentVariable.ADMIN_CONSOLE_PORT,
        readEnv: readEnvInt,
    },
    adminConsoleHost: {
        type: z.string(),
        default: '',
        description: 'Host address the HTTP listener binds; an empty value leaves the runtime default.',
        path: 'server.adminConsole.host',
        env: EnvironmentVariable.ADMIN_CONSOLE_HOST,
        readEnv: readEnvString,
    },
} satisfies ConfigSchema<AdminConsoleSectionConfig, never, EnvironmentVariable>;
