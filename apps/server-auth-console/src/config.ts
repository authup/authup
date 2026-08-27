/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ConfigSchema } from '@authup/server-config-kit';
import { BASE_CONFIG_SCHEMA } from '@authup/server-config-base';
import {
    buildSchemaDefaults,
    readEnvInt,
    readEnvString,
    readSchemaFromEnv,
} from '@authup/server-config-kit';
import { z } from 'zod';
import { AUTH_CONSOLE_BASE_PATH } from './constants';
import type { AuthConsoleConfig, AuthConsoleConfigInput } from './types';

/**
 * The section of `authup.yml` this service owns. Every key below spells its
 * own absolute `path`, so the section is documentation rather than a prefix
 * the reader applies.
 */
export const AUTH_CONSOLE_CONFIG_SECTION = 'server.authConsole';

/**
 * The keys this service reads, declared the same way server-core declares
 * its own (plan 101 stage C). Three of them are read by server-core too:
 * `publicUrl` and `themeDirectoryPath` / `themeFragmentsEnabled` are
 * deployment-wide, and `authConsoleUrl` is where server-core's page GETs
 * redirect. Those entries are therefore declared identically in both
 * registries: `composeSchemas` refuses a pair that disagrees on path,
 * environment variable, default or reader, which is what keeps two
 * independent declarations of one configuration key honest without either
 * package depending on the other.
 */
export const AUTH_CONSOLE_CONFIG_SCHEMA = {
    publicUrl: BASE_CONFIG_SCHEMA.publicUrl,
    authConsoleUrl: BASE_CONFIG_SCHEMA.authConsoleUrl,
    themeDirectoryPath: BASE_CONFIG_SCHEMA.themeDirectoryPath,
    themeFragmentsEnabled: BASE_CONFIG_SCHEMA.themeFragmentsEnabled,
    authConsolePath: {
        type: z.string(),
        default: '',
        description: 'EXPERIMENTAL. Package directory of a substituted @authup/client-auth-console, consulted before the node_modules resolution walk; an empty value resolves the package from node_modules. ' +
            'The substitute replaces the login and consent implementation, not its styling.',
        path: 'server.authConsole.path',
        env: 'AUTH_CONSOLE_PATH',
        readEnv: readEnvString,
    },
    authConsolePort: {
        type: z.number().nonnegative(),
        default: 3020,
        description: 'TCP port the standalone listener binds. Unrelated to the url above, which is the address a browser reaches.',
        path: 'server.authConsole.port',
        env: 'AUTH_CONSOLE_PORT',
        readEnv: readEnvInt,
    },
    authConsoleHost: {
        type: z.string(),
        default: '0.0.0.0',
        description: 'Host address the standalone listener binds.',
        path: 'server.authConsole.host',
        env: 'AUTH_CONSOLE_HOST',
        readEnv: readEnvString,
    },
} satisfies ConfigSchema<AuthConsoleConfigInput, 'publicUrl'>;

/**
 * Fill in what the raw input left out and map the configuration namespace
 * onto this service's own vocabulary.
 *
 * Relative paths resolve against the CALLER's root, so they arrive absolute.
 * A standalone bin resolves them against the process working directory; the
 * CLI resolves them against server-core's `rootPath`, which is the same value
 * unless the operator moved it.
 */
export function resolveAuthConsoleConfig(input: Partial<AuthConsoleConfigInput>) : AuthConsoleConfig {
    const resolved = {
        ...buildSchemaDefaults<AuthConsoleConfigInput>(AUTH_CONSOLE_CONFIG_SCHEMA),
        ...input,
    } as AuthConsoleConfigInput;

    if (!resolved.publicUrl) {
        throw new Error(
            'The auth console service needs the public URL of server-core. Set PUBLIC_URL.',
        );
    }

    return {
        url: resolved.authConsoleUrl ||
            `${resolved.publicUrl.replace(/\/+$/, '')}${AUTH_CONSOLE_BASE_PATH}`,
        apiUrl: resolved.publicUrl,
        port: resolved.authConsolePort,
        host: resolved.authConsoleHost,
        distPath: resolved.authConsolePath,
        themeDirectoryPath: resolved.themeDirectoryPath,
        themeFragmentsEnabled: resolved.themeFragmentsEnabled,
    };
}

/**
 * The standalone entry's own read. `authup.yml` reaches this service through
 * the CLI roles, which hand each factory its section; a bin started by hand
 * reads the environment alone.
 *
 * The explicit type argument is load-bearing: inferred from the schema
 * object, a key with no default (`publicUrl` is derived) comes back as
 * `unknown`.
 */
export function readAuthConsoleConfigFromEnv() : AuthConsoleConfig {
    const input = readSchemaFromEnv<AuthConsoleConfigInput>(AUTH_CONSOLE_CONFIG_SCHEMA);

    return resolveAuthConsoleConfig(input);
}
