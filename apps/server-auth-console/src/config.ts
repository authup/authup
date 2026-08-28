/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    AUTH_CONSOLE_CONFIG_SCHEMA,
    CONFIG_SECTION_KEY,
    ROOT_CONFIG_SCHEMA,
    THEME_CONFIG_SCHEMA,
} from '@authup/server-config';
import type { ConfigSchema } from '@authup/server-config-kit';
import { buildSchemaDefaults, readSchemaFromEnv } from '@authup/server-config-kit';
import { AUTH_CONSOLE_BASE_PATH } from './constants';
import type { AuthConsoleConfig, AuthConsoleConfigInput } from './types';

export { AUTH_CONSOLE_CONFIG_SECTION } from '@authup/server-config';

/**
 * The keys this service reads, SELECTED out of the document schema by name.
 *
 * Nothing is declared here: every key of `authup.yml` is declared once in
 * `@authup/server-config`, so this service cannot spell a path, an
 * environment variable, a default or a reader differently from server-core,
 * which reads `publicUrl` and `authConsoleUrl` too. Neither package depends
 * on the other; both depend on the declaration.
 */
export const AUTH_CONSOLE_CONFIG_SCHEMA = {
    ...AUTH_CONSOLE_CONFIG_SCHEMA,
    [CONFIG_SECTION_KEY.THEME]: THEME_CONFIG_SCHEMA,
    publicUrl: ROOT_CONFIG_SCHEMA.publicUrl,
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
        url: resolved.url ||
            `${resolved.publicUrl.replace(/\/+$/, '')}${AUTH_CONSOLE_BASE_PATH}`,
        apiUrl: resolved.publicUrl,
        port: resolved.port,
        host: resolved.host,
        distPath: resolved.path,
        theme: resolved.theme,
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
