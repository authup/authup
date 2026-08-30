/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ConfigSchema } from '@authup/server-config-kit';
import {
    readEnvBool,
    readEnvInt,
    readEnvString,
    withSectionPaths,
} from '@authup/server-config-kit';
import { z } from 'zod';
import { EnvironmentVariable } from '../../constants.ts';
import { urlOrEmpty } from '../../utils.ts';
import type { AccountConsoleConfig } from './types.ts';
import { ROOT_CONFIG_SCHEMA } from '../root';
import { CORE_CONFIG_SCHEMA } from '../core';

export const ACCOUNT_CONSOLE_CONFIG_SECTION = 'server.accountConsole';

export const ACCOUNT_CONSOLE_CONFIG_SCHEMA = withSectionPaths(
    ACCOUNT_CONSOLE_CONFIG_SECTION,
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
            // its own location first, then the deployment-wide one. Three
            // listeners behind one proxy bind the same address far more often
            // than not, and `port` has no such fallback because they cannot
            // share one.
            path: `${ACCOUNT_CONSOLE_CONFIG_SECTION}.host`,
            env: EnvironmentVariable.ACCOUNT_CONSOLE_HOST,
            readEnv: readEnvString,
            alt: [
                ROOT_CONFIG_SCHEMA.defaultHost,
                CORE_CONFIG_SCHEMA.host,
            ],
        },
    },
) satisfies ConfigSchema<AccountConsoleConfig, never, EnvironmentVariable>;
