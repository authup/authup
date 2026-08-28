/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ConfigSchema } from '@authup/server-config-kit';
import {
    readEnvInt,
    readEnvString,
    withSectionPaths,
} from '@authup/server-config-kit';
import { z } from 'zod';
import { DEFAULT_HOST_CONFIG_PATH, EnvironmentVariable } from '../../constants.ts';
import { urlOrEmpty } from '../../utils.ts';
import type { AuthConsoleConfig } from './types.ts';

export const AUTH_CONSOLE_CONFIG_SECTION = 'server.authConsole';

export const AUTH_CONSOLE_CONFIG_SCHEMA = withSectionPaths(
    AUTH_CONSOLE_CONFIG_SECTION,
    {
        url: {
            type: urlOrEmpty,
            default: '',
            description: 'Where the auth console service (@authup/server-auth-console) is served, e.g. https://example.com/console/auth. ' +
            'The hosted login, consent and workflow page GETs redirect there. An empty value derives it from publicUrl, which is the single-origin default.',
            env: EnvironmentVariable.AUTH_CONSOLE_URL,
            readEnv: readEnvString,
        },
        path: {
            type: z.string(),
            default: '',
            description: 'EXPERIMENTAL. Package directory of a substituted @authup/client-auth-console, consulted before the node_modules resolution walk; an empty value resolves the package from node_modules. ' +
            'The substitute replaces the login and consent implementation, not its styling.',
            env: EnvironmentVariable.AUTH_CONSOLE_PATH,
            readEnv: readEnvString,
        },
        port: {
            type: z.number().nonnegative(),
            default: 3020,
            description: 'TCP port the standalone listener binds. Unrelated to the url above, which is the address a browser reaches.',
            env: EnvironmentVariable.AUTH_CONSOLE_PORT,
            readEnv: readEnvInt,
        },
        host: {
            type: z.string(),
            default: '0.0.0.0',
            description: 'Host address the standalone listener binds. Falls back to the deployment-wide `host` (HOST).',
            // its own location first, then the deployment-wide one. Three
            // listeners behind one proxy bind the same address far more often
            // than not, and `port` has no such fallback because they cannot
            // share one.
            path: [`${AUTH_CONSOLE_CONFIG_SECTION}.host`, DEFAULT_HOST_CONFIG_PATH],
            env: [EnvironmentVariable.AUTH_CONSOLE_HOST, EnvironmentVariable.HOST],
            readEnv: readEnvString,
        },
    },
) satisfies ConfigSchema<AuthConsoleConfig, never, EnvironmentVariable>;
