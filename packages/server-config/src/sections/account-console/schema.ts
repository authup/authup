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
import { ACCOUNT_CONSOLE_BASE_PATH } from './constants.ts';
import { assertConsoleOrigin, resolveRootRelativePath } from '../../helpers/index.ts';
import type { AccountConsoleConfig } from './types.ts';

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
            // Empty means this console sits on the deployment's own origin under
            // its default segment, which is the single-origin deployment. The
            // derivation is declared here so every reader computes it: the
            // serving service, server-core (which redirects to it) and
            // `authup config schema` alike.
            resolve: ({ value, get }) => {
                const publicUrl = get('publicUrl') as string;
                const url = (value as string) ||
                    `${publicUrl.replace(/\/+$/, '')}${ACCOUNT_CONSOLE_BASE_PATH}`;

                // Another PATH is what this key is for; another DOMAIN
                // half-works rather than failing, so it fails here, for every
                // reader, rather than in one service's boot sequence.
                assertConsoleOrigin('server.accountConsole', url, publicUrl);

                return url;
            },
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
            // Relative to `rootPath`, so one document means the same directory
            // to every service it configures, whichever process cwd each was
            // started from.
            resolve: ({ value, get }) => resolveRootRelativePath(value as string, get('rootPath') as string),
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
            // '' means unset, which is what makes the inheritance below
            // reachable: a real default would BE the value, and the
            // deployment-wide one could never reach this listener.
            default: '',
            description: 'Host address the HTTP listener binds. Inherits the deployment-wide `host` (HOST) unless it names its own.',
            env: EnvironmentVariable.ACCOUNT_CONSOLE_HOST,
            readEnv: readEnvString,
            resolve: ({ value, get }) => (value as string) || get('host') as string,
        },
    },
    { pathPrefix: 'server.accountConsole' },
);
