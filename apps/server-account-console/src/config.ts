/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    ACCOUNT_CONSOLE_CONFIG_SCHEMA,
    CONFIG_SECTION_KEY,
    ROOT_CONFIG_SCHEMA,
    THEME_CONFIG_SCHEMA,
} from '@authup/server-config';
import type { ConfigSchema } from '@authup/server-config-kit';
import { buildSchemaDefaults, readSchemaFromEnv } from '@authup/server-config-kit';
import { ACCOUNT_CONSOLE_BASE_PATH } from './constants';
import type { Config, ConfigInput } from './types';

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
export const SCHEMA = {
    ...ACCOUNT_CONSOLE_CONFIG_SCHEMA,
    ...ROOT_CONFIG_SCHEMA,
    [CONFIG_SECTION_KEY.THEME]: THEME_CONFIG_SCHEMA,
} satisfies ConfigSchema<ConfigInput, 'publicUrl' | 'db'>;

/**
 * Turn the configuration namespace into the service's own shape: fill the
 * defaults, derive the one key that is derived rather than configured, and
 * rename. An empty `url` means the console sits on
 * server-core's own origin under the default segment, which is the
 * single-origin deployment.
 */
export function resolveAccountConsoleConfig(
    input: Partial<ConfigInput>,
) : Config {
    const values = {
        ...buildSchemaDefaults<ConfigInput>(SCHEMA),
        ...input,
    } as ConfigInput;

    if (!values.publicUrl) {
        throw new Error(
            'The account console service needs the public URL of server-core. Set PUBLIC_URL.',
        );
    }

    return {
        url: values.url ||
            `${values.publicUrl.replace(/\/+$/, '')}${ACCOUNT_CONSOLE_BASE_PATH}`,
        apiUrl: values.publicUrl,
        enabled: values.enabled,
        port: values.port,
        host: values.host,
        distPath: values.distPath,
        trustedOrigins: values.trustedOrigins,
        theme: values.theme,
    };
}

/**
 * The standalone entry's configuration, read from the environment alone.
 * `authup.yml` reaches this service through the CLI roles, which compose this
 * very registry into the one document loader.
 */
export function readAccountConsoleConfigFromEnv() : Config {
    // The explicit type argument is load-bearing: inferred from the schema
    // object, a key declared without a default (the derived publicUrl) comes
    // back as unknown.
    const input : Partial<ConfigInput> = readSchemaFromEnv<ConfigInput>(
        SCHEMA,
    );

    return resolveAccountConsoleConfig(input);
}
