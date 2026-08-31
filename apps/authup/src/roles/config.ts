/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    Config as AccountConsoleConfig,
    ConfigInput as AccountConsoleConfigInput,
} from '@authup/server-account-console';
import { ACCOUNT_CONSOLE_CONFIG_SCHEMA, resolveAccountConsoleConfig } from '@authup/server-account-console';
import type {
    Config as AdminConsoleConfig,
    ConfigInput as AdminConsoleConfigInput,
} from '@authup/server-admin-console';
import { ADMIN_CONSOLE_CONFIG_SCHEMA, resolveAdminConsoleConfig } from '@authup/server-admin-console';
import type {
    Config as AuthConsoleConfig,
    ConfigInput as AuthConsoleConfigInput,
} from '@authup/server-auth-console';
import { AUTH_CONSOLE_CONFIG_SCHEMA, resolveAuthConsoleConfig } from '@authup/server-auth-console';
import { mergeSchemaData, readSchemaFromEnv, readSchemaFromFileTree } from '@authup/server-config-kit';
import type { SchemaInput } from '@authup/server-config-kit';
import type { AuthupConfig, ConfigReadFsOptions } from '@authup/server-config';
import { readConfigFileTree } from '@authup/server-config';
import type { Config } from '@authup/server-core';
import path from 'node:path';

export type ConsoleConfigs = {
    auth: AuthConsoleConfig,
    admin: AdminConsoleConfig,
    account: AccountConsoleConfig,
};

/**
 * Resolve a path key the way server-core resolves its own: against the
 * configured `rootPath` rather than the process working directory, so one
 * document means the same thing to every service it configures. A service
 * started through its own bin has no `rootPath` and resolves against the cwd,
 * which is the same directory unless the operator moved it.
 */
function resolvePaths<T extends { distPath: string, theme: { directoryPath: string } }>(
    config: T,
    rootPath: string,
) : T {
    return {
        ...config,
        distPath: config.distPath ? path.resolve(rootPath, config.distPath) : '',
        theme: {
            ...config.theme,
            directoryPath: config.theme.directoryPath ?
                path.resolve(rootPath, config.theme.directoryPath) :
                '',
        },
    };
}

/**
 * The three console services' configuration, read from the same `authup.yml`
 * and the same environment server-core read, each through its own registry.
 *
 * The document is read once and every registry takes its own keys out of it;
 * the environment wins over the file, as it does everywhere else. The two
 * passes are layered SECTION-AWARE, since a spread would let an environment
 * value for one key of a section replace the whole section the file supplied.
 *
 * `core` is server-core's RESOLVED configuration, not a raw read of the same
 * document, and the caller has to supply one. Three of the values below are
 * products of `normalizeConfig` rather than of any key: `publicUrl` is
 * DERIVED from host and port when the document names none, `trustedOrigins`
 * is canonicalized and dev-seeded, and `rootPath` is absolute. Reading the
 * document again here would hand a console the raw values and silently lose
 * all three.
 */
export async function readConsoleConfigs(
    options: ConfigReadFsOptions<AuthupConfig>,
    core: Config,
) : Promise<ConsoleConfigs> {
    const { tree } = await readConfigFileTree(options);

    const read = <T extends { publicUrl: string, trustedOrigins: string[] }>(
        schema: SchemaInput<T>,
    ) : Partial<T> => ({
        ...mergeSchemaData<T>(
            schema,
            readSchemaFromFileTree<T>(tree, schema),
            readSchemaFromEnv<T>(schema),
        ),
        // The two deployment-wide keys a console must NOT resolve for itself,
        // taken from the resolved core configuration instead.
        //
        // `publicUrl` is DERIVED from host and port when the document names
        // none, and a console has no host and port of the API's to derive it
        // from. `trustedOrigins` is CANONICALIZED (a bare host expands to its
        // http and its https origin, entries are deduped), which
        // normalizeConfig owns; the raw list would leave the account console
        // matching its `ref` back link against a scheme-less pattern that
        // matches nothing, so the link would silently disappear for exactly
        // the origins written in the short form.
        publicUrl: core.publicUrl,
        trustedOrigins: core.trustedOrigins,
    });

    return {
        auth: resolvePaths(
            resolveAuthConsoleConfig(read<AuthConsoleConfigInput>(AUTH_CONSOLE_CONFIG_SCHEMA)),
            core.rootPath,
        ),
        admin: resolvePaths(
            resolveAdminConsoleConfig(read<AdminConsoleConfigInput>(ADMIN_CONSOLE_CONFIG_SCHEMA)),
            core.rootPath,
        ),
        account: resolvePaths(
            resolveAccountConsoleConfig(read<AccountConsoleConfigInput>(ACCOUNT_CONSOLE_CONFIG_SCHEMA)),
            core.rootPath,
        ),
    };
}
