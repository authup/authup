/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AccountConsoleConfig, AccountConsoleConfigInput } from '@authup/server-account-console';
import { ACCOUNT_CONSOLE_CONFIG_SCHEMA, resolveAccountConsoleConfig } from '@authup/server-account-console';
import type { AdminConsoleConfig, AdminConsoleConfigInput } from '@authup/server-admin-console';
import { ADMIN_CONSOLE_CONFIG_SCHEMA, resolveAdminConsoleConfig } from '@authup/server-admin-console';
import type { AuthConsoleConfig, AuthConsoleConfigInput } from '@authup/server-auth-console';
import { AUTH_CONSOLE_CONFIG_SCHEMA, resolveAuthConsoleConfig } from '@authup/server-auth-console';
import { readSchemaFromEnv, readSchemaFromFileTree } from '@authup/server-config-kit';
import type { ConfigSchemaInput } from '@authup/server-config-kit';
import type { Config, ConfigReadFsOptions } from '@authup/server-core';
import { readConfigFileTree } from '@authup/server-core';
import path from 'node:path';

/**
 * The registries `authup.yml` is the union of, beyond server-core's own.
 *
 * Each service package declares the keys it reads, and a key two packages
 * both read is declared in both. Nothing imports across the boundary in
 * either direction: server-core reaching into a console package would drag
 * that console's dist into an `authup core` deployment, and a console
 * package reaching into server-core would drag native crypto bindings,
 * winston and redis into a static file server. `composeSchemas` is what
 * keeps two independent declarations of one key honest instead, by refusing
 * a pair that disagrees on path, environment variable, default or reader.
 *
 * This CLI is the only place that knows about all four, which is its job.
 */
export const CONSOLE_CONFIG_SCHEMAS : { schema: ConfigSchemaInput<any> }[] = [
    { schema: AUTH_CONSOLE_CONFIG_SCHEMA },
    { schema: ADMIN_CONSOLE_CONFIG_SCHEMA },
    { schema: ACCOUNT_CONSOLE_CONFIG_SCHEMA },
];

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
function resolvePaths<T extends { distPath: string, themeDirectoryPath: string }>(
    config: T,
    rootPath: string,
) : T {
    return {
        ...config,
        distPath: config.distPath ? path.resolve(rootPath, config.distPath) : '',
        themeDirectoryPath: config.themeDirectoryPath ?
            path.resolve(rootPath, config.themeDirectoryPath) :
            '',
    };
}

/**
 * The three console services' configuration, read from the same `authup.yml`
 * and the same environment server-core read, each through its own registry.
 *
 * The document is read once and every registry takes its own keys out of it;
 * the environment wins over the file, as it does everywhere else.
 */
export async function readConsoleConfigs(
    options: ConfigReadFsOptions,
    core: Config,
) : Promise<ConsoleConfigs> {
    const { tree } = await readConfigFileTree(options);

    const read = <T>(schema: ConfigSchemaInput<T>) : Partial<T> => ({
        ...readSchemaFromFileTree<T>(tree, schema),
        ...readSchemaFromEnv<T>(schema),
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
