/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ConfigSchema } from '@authup/server-config-kit';
import { readEnvInt, readEnvString } from '@authup/server-config-kit';
import { z } from 'zod';
import { ConfigEnvironmentVariableName } from '../constants.ts';
import { urlOrEmpty } from '../utils.ts';
import type { AuthConsoleSectionConfig } from './types.ts';

export const AUTH_CONSOLE_CONFIG_SECTION = 'server.authConsole';

export const AUTH_CONSOLE_SECTION_CONFIG_SCHEMA = {
    authConsoleUrl: {
        type: urlOrEmpty,
        default: '',
        description: 'Where the auth console service (@authup/server-auth-console) is served, e.g. https://example.com/console/auth. ' +
            'The hosted login, consent and workflow page GETs redirect there. An empty value derives it from publicUrl, which is the single-origin default.',
        path: 'server.authConsole.url',
        env: ConfigEnvironmentVariableName.AUTH_CONSOLE_URL,
        readEnv: readEnvString,
    },
    authConsolePath: {
        type: z.string(),
        default: '',
        description: 'EXPERIMENTAL. Package directory of a substituted @authup/client-auth-console, consulted before the node_modules resolution walk; an empty value resolves the package from node_modules. ' +
            'The substitute replaces the login and consent implementation, not its styling.',
        path: 'server.authConsole.path',
        env: ConfigEnvironmentVariableName.AUTH_CONSOLE_PATH,
        readEnv: readEnvString,
    },
    authConsolePort: {
        type: z.number().nonnegative(),
        default: 3020,
        description: 'TCP port the standalone listener binds. Unrelated to the url above, which is the address a browser reaches.',
        path: 'server.authConsole.port',
        env: ConfigEnvironmentVariableName.AUTH_CONSOLE_PORT,
        readEnv: readEnvInt,
    },
    authConsoleHost: {
        type: z.string(),
        default: '0.0.0.0',
        description: 'Host address the standalone listener binds.',
        path: 'server.authConsole.host',
        env: ConfigEnvironmentVariableName.AUTH_CONSOLE_HOST,
        readEnv: readEnvString,
    },
} satisfies ConfigSchema<AuthConsoleSectionConfig, never, ConfigEnvironmentVariableName>;
