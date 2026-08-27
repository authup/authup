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
import { ADMIN_CONSOLE_BASE_PATH } from './constants';
import type { AdminConsoleConfig, AdminConsoleConfigInput } from './types';

/**
 * The section of `authup.yml` this service's own keys live under. Keys it
 * SHARES with server-core (publicUrl, the theme pair) declare an absolute
 * path of their own instead, and their entries below are copies of
 * server-core's: `composeSchemas` refuses a key two registries declare with a
 * disagreeing path, environment variable or default, because the two would
 * then read one configuration key differently.
 */
export const ADMIN_CONSOLE_CONFIG_SECTION = 'server.adminConsole';

export const ADMIN_CONSOLE_CONFIG_SCHEMA = {
    publicUrl: {
        type: z.url(),
        description: 'Externally reachable base URL of the API. Derived from host and port when unset.',
        path: 'publicUrl',
        env: 'PUBLIC_URL',
        readEnv: readEnvString,
    },
    adminConsoleUrl: {
        type: z.union([z.literal(''), z.url()]),
        default: '',
        description: 'Where the admin console service (@authup/server-admin-console) is served, e.g. https://example.com/console/admin. ' +
            'An empty value derives it from publicUrl, which is the single-origin default.',
        path: 'server.adminConsole.url',
        env: 'ADMIN_CONSOLE_URL',
        readEnv: readEnvString,
    },
    adminConsolePort: {
        type: z.number().nonnegative(),
        default: 3021,
        description: 'TCP port the HTTP listener binds.',
        path: 'server.adminConsole.port',
        env: 'ADMIN_CONSOLE_PORT',
        readEnv: readEnvInt,
    },
    adminConsoleHost: {
        type: z.string(),
        default: '',
        description: 'Host address the HTTP listener binds; an empty value leaves the runtime default.',
        path: 'server.adminConsole.host',
        env: 'ADMIN_CONSOLE_HOST',
        readEnv: readEnvString,
    },
    adminConsoleEnabled: {
        type: z.boolean(),
        default: true,
        description: 'Serve the admin console at /console/admin. Off, the route answers with the disabled notice; a standalone-hosted console is unaffected.',
        path: 'server.adminConsole.enabled',
        env: 'ADMIN_CONSOLE_ENABLED',
        readEnv: readEnvBool,
    },
    adminConsolePath: {
        type: z.string(),
        default: '',
        description: 'Package directory of a substituted @authup/client-admin-console, consulted before the node_modules resolution walk; an empty value resolves the package from node_modules.',
        path: 'server.adminConsole.path',
        env: 'ADMIN_CONSOLE_PATH',
        readEnv: readEnvString,
    },
    themeDirectoryPath: {
        type: z.string(),
        // '' = theming disabled. Deliberately NOT defaulted under a
        // process-writable directory: pairing "process-writable" with
        // "content injected into a first-party page" would turn any write
        // primitive landing there into persistent branding control.
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
} satisfies ConfigSchema<AdminConsoleConfigInput, 'publicUrl'>;

/**
 * Turn the configuration namespace into the service's own shape: fill the
 * defaults, derive the one key that is derived rather than configured, and
 * rename. An empty `adminConsoleUrl` means the console sits on server-core's
 * own origin under the default segment, which is the single-origin
 * deployment.
 */
export function resolveAdminConsoleConfig(
    input: Partial<AdminConsoleConfigInput>,
) : AdminConsoleConfig {
    const values = {
        ...buildSchemaDefaults<AdminConsoleConfigInput>(ADMIN_CONSOLE_CONFIG_SCHEMA),
        ...input,
    } as AdminConsoleConfigInput;

    if (!values.publicUrl) {
        throw new Error(
            'The admin console service needs the public URL of server-core. Set PUBLIC_URL.',
        );
    }

    return {
        url: values.adminConsoleUrl ||
            `${values.publicUrl.replace(/\/+$/, '')}${ADMIN_CONSOLE_BASE_PATH}`,
        apiUrl: values.publicUrl,
        enabled: values.adminConsoleEnabled,
        port: values.adminConsolePort,
        host: values.adminConsoleHost,
        distPath: values.adminConsolePath,
        themeDirectoryPath: values.themeDirectoryPath,
        themeFragmentsEnabled: values.themeFragmentsEnabled,
    };
}

/**
 * The standalone entry's configuration, read from the environment alone.
 * `authup.yml` reaches this service through the CLI roles, which compose this
 * very registry into the one document loader.
 */
export function readAdminConsoleConfigFromEnv() : AdminConsoleConfig {
    // The explicit type argument is load-bearing: inferred from the schema
    // object, a key declared without a default (the derived publicUrl) comes
    // back as unknown.
    const input : Partial<AdminConsoleConfigInput> = readSchemaFromEnv<AdminConsoleConfigInput>(
        ADMIN_CONSOLE_CONFIG_SCHEMA,
    );

    return resolveAdminConsoleConfig(input);
}
