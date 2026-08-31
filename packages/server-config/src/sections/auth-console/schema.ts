/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    defineSchema,
    readEnvInt,
    readEnvString,
} from '@authup/server-config-kit';
import { z } from 'zod';
import { EnvironmentVariable } from '../../constants.ts';
import { urlOrEmpty } from '../../utils.ts';
import type { AuthConsoleConfig } from './types.ts';
import { ROOT_SCHEMA } from '../root/index.ts';

export const AUTH_CONSOLE_SCHEMA = defineSchema<
    AuthConsoleConfig,
    never,
    EnvironmentVariable
>(
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
            env: EnvironmentVariable.AUTH_CONSOLE_HOST,
            readEnv: readEnvString,
            // its own location and variable first, then the
            // deployment-wide one. Three listeners behind one proxy bind
            // the same address far more often than not, and `port` has no
            // such fallback because they cannot share one.
            alt: ROOT_SCHEMA.defaultHost,
        },
    },
    { pathPrefix: 'server.authConsole' },
);
