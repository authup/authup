/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    ADMIN_CONSOLE_SCHEMA,
    CORE_SCHEMA,
    ROOT_SCHEMA,
    SECTION_KEY,
    THEME_SCHEMA,
} from '@authup/server-config';
import {
    buildSchemaDefaults,
    defineSchema,
    mergeSchemaData,
    readSchemaFromEnv,
    resolveSchemaData,
} from '@authup/server-config-kit';
import type { CoreConfig, EnvironmentVariable } from '@authup/server-config';
import type { Config, ConfigInput } from './types';

/**
 * The keys this service reads, SELECTED out of the document schema by name.
 *
 * Nothing is declared here: every key of `authup.yml` is declared once in
 * `@authup/server-config`, so this service cannot spell a path, an
 * environment variable, a default or a reader differently from server-core,
 * which reads several of the same keys. Neither package depends on the other;
 * both depend on the declaration.
 *
 * Its own section is spread, so this service reads it in its own vocabulary
 * (`url`, `port`, `host`); every other section stays under the key the
 * document nests it at.
 */
export const CONFIG_SCHEMA = defineSchema<ConfigInput, 'publicUrl' | 'internalUrl' | 'db'>({
    ...ADMIN_CONSOLE_SCHEMA,
    ...ROOT_SCHEMA,
    [SECTION_KEY.THEME]: THEME_SCHEMA,
    // Two keys of core, never the section. `publicUrl` derives from
    // the core listener address, which is what a console needs; selecting the
    // whole section also selects its INVARIANTS, and `resolveSchemaData` runs
    // every resolver in a registry -- so a console would refuse to start on a
    // short SECRETS_ENCRYPTION_KEY, or on mfaRequired without mfaEnabled, for
    // keys it has no database, key store or MFA to use.
    [SECTION_KEY.CORE]: defineSchema<Pick<CoreConfig, 'host' | 'port'>, never, EnvironmentVariable>({
        host: CORE_SCHEMA.host,
        port: CORE_SCHEMA.port,
    }),
});

/**
 * Turn the configuration namespace into the service's own shape: fill the
 * defaults, derive the one key that is derived rather than configured, and
 * rename. An empty `url` means the console sits on server-core's own origin
 * under the default segment, which is the single-origin deployment.
 *
 * The defaults are layered SECTION-AWARE ({@link mergeSchemaData}): a spread
 * would let an input carrying one key of a section replace the whole section
 * and take every other key's default with it.
 */
export function resolveConfig(
    input: Partial<ConfigInput>,
) : Config {
    const values = resolveSchemaData<ConfigInput>(
        CONFIG_SCHEMA,
        mergeSchemaData<ConfigInput>(
            CONFIG_SCHEMA,
            buildSchemaDefaults<ConfigInput>(CONFIG_SCHEMA),
            input,
        ),
    ) as ConfigInput;

    return {
        url: values.url,
        apiUrl: values.publicUrl,
        enabled: values.enabled,
        port: values.port,
        host: values.host,
        distPath: values.path,
        theme: values.theme,
    };
}

/**
 * The standalone entry's configuration, read from the environment alone.
 * `authup.yml` reaches this service through the CLI roles, which compose this
 * very registry into the one document loader.
 */
export function readConfigFromEnv() : Config {
    // The explicit type argument is load-bearing: inferred from the schema
    // object, a key declared without a default (the derived publicUrl) comes
    // back as unknown.
    const input : Partial<ConfigInput> = readSchemaFromEnv<ConfigInput>(CONFIG_SCHEMA);

    return resolveConfig(input);
}
