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
import { ADMIN_CONSOLE_BASE_PATH } from './constants.ts';
import { assertConsoleOrigin, resolveRootRelativePath } from '../../helpers/index.ts';
import type { AdminConsoleConfig } from './types.ts';
import { ROOT_SCHEMA } from '../root/index.ts';


export const ADMIN_CONSOLE_SCHEMA = defineSchema<
    AdminConsoleConfig,
    never,
    EnvironmentVariable
>(
    {
        url: {
            type: urlOrEmpty,
            default: '',
            description: 'Where the admin console service (@authup/server-admin-console) is served, e.g. https://example.com/console/admin. ' +
            'The server-side login lands the browser there once the session credential is issued. An empty value derives it from publicUrl, which is the single-origin default.',
            env: EnvironmentVariable.ADMIN_CONSOLE_URL,
            readEnv: readEnvString,
            // Empty means this console sits on the deployment's own origin under
            // its default segment, which is the single-origin deployment. The
            // derivation is declared here so every reader computes it: the
            // serving service, server-core (which redirects to it) and
            // `authup config schema` alike.
            resolve: ({ value, get }) => {
                const publicUrl = get('publicUrl') as string;
                const url = (value as string) ||
                    `${publicUrl.replace(/\/+$/, '')}${ADMIN_CONSOLE_BASE_PATH}`;

                // Another PATH is what this key is for; another DOMAIN
                // half-works rather than failing, so it fails here, for every
                // reader, rather than in one service's boot sequence.
                assertConsoleOrigin('server.adminConsole', url, publicUrl);

                return url;
            },
        },
        enabled: {
            type: z.boolean(),
            default: true,
            description: 'Serve the admin console at /console/admin. Off, the console renders the disabled notice and its server-side login answers 404; a standalone-hosted console is unaffected.',
            env: EnvironmentVariable.ADMIN_CONSOLE_ENABLED,
            readEnv: readEnvBool,
        },
        path: {
            type: z.string(),
            default: '',
            description: 'Package directory of a substituted @authup/client-admin-console, consulted before the node_modules resolution walk; an empty value resolves the package from node_modules.',
            env: EnvironmentVariable.ADMIN_CONSOLE_PATH,
            readEnv: readEnvString,
            // Relative to `rootPath`, so one document means the same directory
            // to every service it configures, whichever process cwd each was
            // started from.
            resolve: ({ value, get }) => resolveRootRelativePath(value as string, get('rootPath') as string),
        },
        port: {
            type: z.number().nonnegative(),
            default: 3021,
            description: 'TCP port the HTTP listener binds.',
            env: EnvironmentVariable.ADMIN_CONSOLE_PORT,
            readEnv: readEnvInt,
        },
        host: {
            type: z.string(),
            default: '0.0.0.0',
            description: 'Host address the HTTP listener binds. Falls back to the deployment-wide `host` (HOST).',
            env: EnvironmentVariable.ADMIN_CONSOLE_HOST,
            readEnv: readEnvString,
            // its own location and variable first, then the
            // deployment-wide one. Three listeners behind one proxy bind
            // the same address far more often than not, and `port` has no
            // such fallback because they cannot share one.
            alt: ROOT_SCHEMA.defaultHost,
        },
    },
    { pathPrefix: 'server.adminConsole' },
);
