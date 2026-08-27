/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ConfigSchema } from '@authup/server-config-kit';
import {
    buildSchemaDefaults,
    readEnvBool,
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
    publicUrl: {
        type: z.url(),
        description: 'Externally reachable base URL of the API. Derived from host and port when unset.',
        path: 'publicUrl',
        env: 'PUBLIC_URL',
        readEnv: readEnvString,
    },
    authConsoleUrl: {
        type: z.union([z.literal(''), z.url()]),
        default: '',
        description: 'Where this service is served, e.g. https://example.com/console/auth. ' +
            'The hosted login, consent and workflow page GETs redirect there. An empty value derives it from publicUrl, which is the single-origin default.',
        path: 'server.authConsole.url',
        env: 'AUTH_CONSOLE_URL',
        readEnv: readEnvString,
    },
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
    themeDirectoryPath: {
        type: z.string(),
        default: '',
        description: 'EXPERIMENTAL. Directory holding the operator theme applied to the served consoles (its assets are served at /theme, its theme.json injects CSS custom properties); an empty value disables theming. ' +
            'SECURITY: the directory is operator trust, mount it read-only and never from a source a tenant can write.',
        path: 'theme.directoryPath',
        env: 'THEME_DIRECTORY_PATH',
        readEnv: readEnvString,
    },
    themeFragmentsEnabled: {
        type: z.boolean(),
        default: false,
        description: 'EXPERIMENTAL. Opt in to splicing fragments/head.html from the theme directory into the head of both served consoles. ' +
            'SECURITY: the fragment is raw, unsanitized markup running on the IdP origin, so enabling it must be a deliberate operator decision.',
        path: 'theme.fragmentsEnabled',
        env: 'THEME_FRAGMENTS_ENABLED',
        readEnv: readEnvBool,
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
