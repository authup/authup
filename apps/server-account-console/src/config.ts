/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    ACCOUNT_CONSOLE_SECTION_CONFIG_SCHEMA,
    ROOT_CONFIG_SCHEMA,
    THEME_CONFIG_SCHEMA,
} from '@authup/server-config';
import type { ConfigSchema } from '@authup/server-config-kit';
import { buildSchemaDefaults, readSchemaFromEnv } from '@authup/server-config-kit';
import { ACCOUNT_CONSOLE_BASE_PATH } from './constants';
import type { AccountConsoleConfig, AccountConsoleConfigInput } from './types';

export { ACCOUNT_CONSOLE_CONFIG_SECTION } from '@authup/server-config';

/**
 * The keys this service reads, SELECTED out of the document schema by name.
 *
 * Nothing is declared here: every key of `authup.yml` is declared once in
 * `@authup/server-config`, so this service cannot spell a path, an
 * environment variable, a default or a reader differently from server-core,
 * which reads `publicUrl`, `trustedOrigins`, `accountConsoleUrl` and
 * `accountConsoleEnabled` too. Neither package depends on the other; both
 * depend on the declaration.
 */
export const ACCOUNT_CONSOLE_CONFIG_SCHEMA = {
    ...ACCOUNT_CONSOLE_SECTION_CONFIG_SCHEMA,
    ...THEME_CONFIG_SCHEMA,
    publicUrl: ROOT_CONFIG_SCHEMA.publicUrl,
    trustedOrigins: ROOT_CONFIG_SCHEMA.trustedOrigins,
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
