/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    defineSchema,
    readEnvBool,
    readEnvInt,
    readEnvString,
} from '@authup/server-config-kit';
import { z } from 'zod';
import { EnvironmentVariable } from '../../constants.ts';
import { urlOrEmpty } from '../../utils.ts';
import type { AccountConsoleConfig } from './types.ts';
import { ROOT_SCHEMA } from '../root/index.ts';

export const ACCOUNT_CONSOLE_SCHEMA = defineSchema<
    AccountConsoleConfig,
    never,
    EnvironmentVariable
>(
    {
        url: {
            type: urlOrEmpty,
            default: '',
            description: 'Where the account console service (@authup/server-account-console) is served, e.g. https://example.com/console/account. ' +
            'The server-side login lands the browser there once the session credential is issued. An empty value derives it from publicUrl, which is the single-origin default.',
            env: EnvironmentVariable.ACCOUNT_CONSOLE_URL,
            readEnv: readEnvString,
        },
        enabled: {
            type: z.boolean(),
            default: true,
            description: 'Serve the account self-service console at /console/account (profile, password, authenticators, sessions, applications). Operators with their own self-service portal can disable it.',
            env: EnvironmentVariable.ACCOUNT_CONSOLE_ENABLED,
            readEnv: readEnvBool,
        },
        path: {
            type: z.string(),
            default: '',
            description: 'Package directory of a substituted @authup/client-account-console, consulted before the node_modules resolution walk; an empty value resolves the package from node_modules.',
            env: EnvironmentVariable.ACCOUNT_CONSOLE_PATH,
            readEnv: readEnvString,
        },
        port: {
            type: z.number().nonnegative(),
            default: 3022,
            description: 'TCP port the HTTP listener binds.',
            env: EnvironmentVariable.ACCOUNT_CONSOLE_PORT,
            readEnv: readEnvInt,
        },
        host: {
            type: z.string(),
            default: '',
            description: 'Host address the HTTP listener binds. Falls back to the deployment-wide `host` (HOST); unset everywhere, it leaves the runtime default.',
            env: EnvironmentVariable.ACCOUNT_CONSOLE_HOST,
            readEnv: readEnvString,
            // its own location and variable first, then the
            // deployment-wide one. Three listeners behind one proxy bind
            // the same address far more often than not, and `port` has no
            // such fallback because they cannot share one.
            alt: ROOT_SCHEMA.defaultHost,
        },
    },
    { pathPrefix: 'server.accountConsole' },
);
