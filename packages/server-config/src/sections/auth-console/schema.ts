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
import { AUTH_CONSOLE_BASE_PATH } from './constants.ts';
import { assertConsoleOrigin, resolveRootRelativePath } from '../../helpers/index.ts';
import type { AuthConsoleConfig } from './types.ts';

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
            // Empty means this console sits on the deployment's own origin under
            // its default segment, which is the single-origin deployment. The
            // derivation is declared here so every reader computes it: the
            // serving service, server-core (which redirects to it) and
            // `authup config schema` alike.
            resolve: ({ value, get }) => {
                const publicUrl = get('publicUrl') as string;
                const url = (value as string) ||
                    `${publicUrl.replace(/\/+$/, '')}${AUTH_CONSOLE_BASE_PATH}`;

                // Another PATH is what this key is for; another DOMAIN
                // half-works rather than failing, so it fails here, for every
                // reader, rather than in one service's boot sequence.
                assertConsoleOrigin('server.authConsole', url, publicUrl);

                return url;
            },
        },
        path: {
            type: z.string(),
            default: '',
            description: 'EXPERIMENTAL. Package directory of a substituted @authup/client-auth-console, consulted before the node_modules resolution walk; an empty value resolves the package from node_modules. ' +
            'The substitute replaces the login and consent implementation, not its styling.',
            env: EnvironmentVariable.AUTH_CONSOLE_PATH,
            readEnv: readEnvString,
            // Relative to `rootPath`, so one document means the same directory
            // to every service it configures, whichever process cwd each was
            // started from.
            resolve: ({ value, get }) => resolveRootRelativePath(value as string, get('rootPath') as string),
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
            // '' means unset, which is what makes the inheritance below
            // reachable: a real default would BE the value, and the
            // deployment-wide one could never reach this listener.
            default: '',
            description: 'Host address the HTTP listener binds. Inherits the deployment-wide `host` (HOST) unless it names its own.',
            env: EnvironmentVariable.AUTH_CONSOLE_HOST,
            readEnv: readEnvString,
            resolve: ({ value, get }) => (value as string) || get('host') as string,
        },
    },
    { pathPrefix: 'server.authConsole' },
);
