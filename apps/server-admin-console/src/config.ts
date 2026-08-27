/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    ADMIN_CONSOLE_SECTION_CONFIG_SCHEMA,
    DEPLOYMENT_CONFIG_SCHEMA,
    THEME_CONFIG_SCHEMA,
} from '@authup/server-config';
import type { ConfigSchema } from '@authup/server-config-kit';
import { buildSchemaDefaults, readSchemaFromEnv } from '@authup/server-config-kit';
import { ADMIN_CONSOLE_BASE_PATH } from './constants';
import type { AdminConsoleConfig, AdminConsoleConfigInput } from './types';

export { ADMIN_CONSOLE_CONFIG_SECTION } from '@authup/server-config';

/**
 * The keys this service reads, SELECTED out of the document schema by name.
 *
 * Nothing is declared here: every key of `authup.yml` is declared once in
 * `@authup/server-config`, so this service cannot spell a path, an
 * environment variable, a default or a reader differently from server-core,
 * which reads `publicUrl`, `adminConsoleUrl` and `adminConsoleEnabled` too.
 * Neither package depends on the other; both depend on the declaration.
 */
export const ADMIN_CONSOLE_CONFIG_SCHEMA = {
    ...ADMIN_CONSOLE_SECTION_CONFIG_SCHEMA,
    ...THEME_CONFIG_SCHEMA,
    publicUrl: DEPLOYMENT_CONFIG_SCHEMA.publicUrl,
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
