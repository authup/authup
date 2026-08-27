/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ConfigSchema } from '@authup/server-config-kit';
import {
    readEnvArray,
    readEnvBool,
    readEnvString,
} from '@authup/server-config-kit';
import { z } from 'zod';
import { BaseConfigEnvironmentVariableName } from './constants';
import { expandToOrigins } from './origins';
import type { BaseConfig } from './types';

const urlOrEmpty = z.union([z.literal(''), z.url()]);

/**
 * One declaration per shared key. A consumer spreads the entries it reads
 * into its own registry, so every reader gets the same path, the same
 * environment variable, the same default, the same reader AND the same zod
 * type and description. `composeSchemas` still compares what it can, which
 * now guards a third-party registry rather than authup's own.
 *
 * `publicUrl` carries no default on purpose: server-core derives it from its
 * host and port, and a consumer that cannot derive it says so by refusing to
 * start.
 */
export const BASE_CONFIG_SCHEMA = {
    publicUrl: {
        type: z.url(),
        description: 'Externally reachable base URL of the API. Derived from host and port when unset.',
        path: 'publicUrl',
        env: BaseConfigEnvironmentVariableName.PUBLIC_URL,
        readEnv: readEnvString,
    },
    trustedOrigins: {
        type: z.array(z.string().refine((value) => {
            try {
                expandToOrigins(value);
                return true;
            } catch {
                return false;
            }
        }, 'must be a http(s) origin or a bare host[:port]')),
        default: [],
        description: 'Trusted first-party app origins besides publicUrl, used as redirect targets for the per-realm public system clients; entries are http(s) origins or bare hosts (a bare host expands to its http and https origin) and do not drive CORS. ' +
            'SECURITY: the system clients auto-consent with the global scope, so every origin listed here can obtain a full-permission user token in every realm.',
        path: 'trustedOrigins',
        env: BaseConfigEnvironmentVariableName.TRUSTED_ORIGINS,
        readEnv: readEnvArray,
    },
    themeDirectoryPath: {
        type: z.string(),
        // '' = theming disabled. Deliberately NOT defaulted under a
        // process-writable directory: pairing "process-writable" with
        // "content injected into the login page" would turn any write
        // primitive landing there into persistent branding control on the
        // IdP origin.
        default: '',
        description: 'EXPERIMENTAL. Directory holding the operator theme applied to the served consoles (its assets are served under each console, its theme.json injects CSS custom properties); an empty value disables theming. ' +
            'SECURITY: the directory is operator trust, mount it read-only and never from a source a tenant can write.',
        path: 'theme.directoryPath',
        env: BaseConfigEnvironmentVariableName.THEME_DIRECTORY_PATH,
        readEnv: readEnvString,
    },
    themeFragmentsEnabled: {
        type: z.boolean(),
        default: false,
        description: 'EXPERIMENTAL. Opt in to splicing fragments/head.html from the theme directory into the head of every served console. ' +
            'SECURITY: the fragment is raw, unsanitized markup running on the IdP origin, so enabling it must be a deliberate operator decision.',
        path: 'theme.fragmentsEnabled',
        env: BaseConfigEnvironmentVariableName.THEME_FRAGMENTS_ENABLED,
        readEnv: readEnvBool,
    },
    authConsoleUrl: {
        type: urlOrEmpty,
        default: '',
        description: 'Where the auth console service (@authup/server-auth-console) is served, e.g. https://example.com/console/auth. ' +
            'The hosted login, consent and workflow page GETs redirect there. An empty value derives it from publicUrl, which is the single-origin default.',
        path: 'server.authConsole.url',
        env: BaseConfigEnvironmentVariableName.AUTH_CONSOLE_URL,
        readEnv: readEnvString,
    },
    accountConsoleUrl: {
        type: urlOrEmpty,
        default: '',
        description: 'Where the account console service (@authup/server-account-console) is served, e.g. https://example.com/console/account. ' +
            'The server-side login lands the browser there once the session credential is issued. An empty value derives it from publicUrl, which is the single-origin default.',
        path: 'server.accountConsole.url',
        env: BaseConfigEnvironmentVariableName.ACCOUNT_CONSOLE_URL,
        readEnv: readEnvString,
    },
    adminConsoleUrl: {
        type: urlOrEmpty,
        default: '',
        description: 'Where the admin console service (@authup/server-admin-console) is served, e.g. https://example.com/console/admin. ' +
            'The server-side login lands the browser there once the session credential is issued. An empty value derives it from publicUrl, which is the single-origin default.',
        path: 'server.adminConsole.url',
        env: BaseConfigEnvironmentVariableName.ADMIN_CONSOLE_URL,
        readEnv: readEnvString,
    },
    accountConsoleEnabled: {
        type: z.boolean(),
        default: true,
        description: 'Serve the account self-service console at /console/account (profile, password, authenticators, sessions, applications). Operators with their own self-service portal can disable it.',
        path: 'server.accountConsole.enabled',
        env: BaseConfigEnvironmentVariableName.ACCOUNT_CONSOLE_ENABLED,
        readEnv: readEnvBool,
    },
    adminConsoleEnabled: {
        type: z.boolean(),
        default: true,
        description: 'Serve the admin console at /console/admin. Off, the console renders the disabled notice and its server-side login answers 404; a standalone-hosted console is unaffected.',
        path: 'server.adminConsole.enabled',
        env: BaseConfigEnvironmentVariableName.ADMIN_CONSOLE_ENABLED,
        readEnv: readEnvBool,
    },
} satisfies ConfigSchema<BaseConfig, 'publicUrl', BaseConfigEnvironmentVariableName>;
