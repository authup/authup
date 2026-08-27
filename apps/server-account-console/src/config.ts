/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ConfigSchema } from '@authup/server-config-kit';
import {
    buildSchemaDefaults,
    readEnvArray,
    readEnvBool,
    readEnvInt,
    readEnvString,
    readSchemaFromEnv,
} from '@authup/server-config-kit';
import { z } from 'zod';
import { ACCOUNT_CONSOLE_BASE_PATH } from './constants';
import type { AccountConsoleConfig, AccountConsoleConfigInput } from './types';

/**
 * The section of `authup.yml` this service's own keys live under. Keys it
 * SHARES with server-core (publicUrl, trustedOrigins, the theme pair) declare
 * an absolute path of their own instead, and their entries below are copies
 * of server-core's: `composeSchemas` refuses a key two registries declare
 * with a disagreeing path, environment variable or default, because the two
 * would then read one configuration key differently.
 */
export const ACCOUNT_CONSOLE_CONFIG_SECTION = 'server.accountConsole';

export const ACCOUNT_CONSOLE_CONFIG_SCHEMA = {
    publicUrl: {
        type: z.url(),
        description: 'Externally reachable base URL of the API. Derived from host and port when unset.',
        path: 'publicUrl',
        env: 'PUBLIC_URL',
        readEnv: readEnvString,
    },
    accountConsoleUrl: {
        type: z.union([z.literal(''), z.url()]),
        default: '',
        description: 'Where the account console service (@authup/server-account-console) is served, e.g. https://example.com/console/account. ' +
            'An empty value derives it from publicUrl, which is the single-origin default.',
        path: 'server.accountConsole.url',
        env: 'ACCOUNT_CONSOLE_URL',
        readEnv: readEnvString,
    },
    accountConsolePort: {
        type: z.number().nonnegative(),
        default: 3022,
        description: 'TCP port the HTTP listener binds.',
        path: 'server.accountConsole.port',
        env: 'ACCOUNT_CONSOLE_PORT',
        readEnv: readEnvInt,
    },
    accountConsoleHost: {
        type: z.string(),
        default: '',
        description: 'Host address the HTTP listener binds; an empty value leaves the runtime default.',
        path: 'server.accountConsole.host',
        env: 'ACCOUNT_CONSOLE_HOST',
        readEnv: readEnvString,
    },
    accountConsoleEnabled: {
        type: z.boolean(),
        default: true,
        description: 'Serve the account self-service console at /console/account (profile, password, authenticators, sessions, applications). Operators with their own self-service portal can disable it.',
        path: 'server.accountConsole.enabled',
        env: 'ACCOUNT_CONSOLE_ENABLED',
        readEnv: readEnvBool,
    },
    accountConsolePath: {
        type: z.string(),
        default: '',
        description: 'Package directory of a substituted @authup/client-account-console, consulted before the node_modules resolution walk; an empty value resolves the package from node_modules.',
        path: 'server.accountConsole.path',
        env: 'ACCOUNT_CONSOLE_PATH',
        readEnv: readEnvString,
    },
    trustedOrigins: {
        // Entries must already be canonical http(s) origins: server-core's
        // normalizeConfig owns the bare-host expansion, and the CLI roles hand
        // the normalized list over. Reading the environment directly, as the
        // standalone bin does, performs no expansion, so a bare `hub.local`
        // has to be written as a full origin there.
        type: z.array(z.string()),
        default: [],
        description: 'Trusted first-party app origins besides publicUrl, used as redirect targets for the per-realm public system clients; entries are http(s) origins or bare hosts (a bare host expands to its http and https origin) and do not drive CORS. ' +
            'SECURITY: the system clients auto-consent with the global scope, so every origin listed here can obtain a full-permission user token in every realm.',
        path: 'trustedOrigins',
        env: 'TRUSTED_ORIGINS',
        readEnv: readEnvArray,
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
} satisfies ConfigSchema<AccountConsoleConfigInput, 'publicUrl'>;

/**
 * Turn the configuration namespace into the service's own shape: fill the
 * defaults, derive the one key that is derived rather than configured, and
 * rename. An empty `accountConsoleUrl` means the console sits on
 * server-core's own origin under the default segment, which is the
 * single-origin deployment.
 */
export function resolveAccountConsoleConfig(
    input: Partial<AccountConsoleConfigInput>,
) : AccountConsoleConfig {
    const values = {
        ...buildSchemaDefaults<AccountConsoleConfigInput>(ACCOUNT_CONSOLE_CONFIG_SCHEMA),
        ...input,
    } as AccountConsoleConfigInput;

    if (!values.publicUrl) {
        throw new Error(
            'The account console service needs the public URL of server-core. Set PUBLIC_URL.',
        );
    }

    return {
        url: values.accountConsoleUrl ||
            `${values.publicUrl.replace(/\/+$/, '')}${ACCOUNT_CONSOLE_BASE_PATH}`,
        apiUrl: values.publicUrl,
        enabled: values.accountConsoleEnabled,
        port: values.accountConsolePort,
        host: values.accountConsoleHost,
        distPath: values.accountConsolePath,
        trustedOrigins: values.trustedOrigins,
        themeDirectoryPath: values.themeDirectoryPath,
        themeFragmentsEnabled: values.themeFragmentsEnabled,
    };
}

/**
 * The standalone entry's configuration, read from the environment alone.
 * `authup.yml` reaches this service through the CLI roles, which compose this
 * very registry into the one document loader.
 */
export function readAccountConsoleConfigFromEnv() : AccountConsoleConfig {
    // The explicit type argument is load-bearing: inferred from the schema
    // object, a key declared without a default (the derived publicUrl) comes
    // back as unknown.
    const input : Partial<AccountConsoleConfigInput> = readSchemaFromEnv<AccountConsoleConfigInput>(
        ACCOUNT_CONSOLE_CONFIG_SCHEMA,
    );

    return resolveAccountConsoleConfig(input);
}
