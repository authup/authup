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

export type ConsoleConfigs = {
    auth: AuthConsoleConfig,
    admin: AdminConsoleConfig,
    account: AccountConsoleConfig,
};

/**
 * The three console services' configuration, read from the same `authup.yml`
 * and the same environment server-core reads, each through its own registry.
 *
 * Nothing of server-core's is handed over, and that is the whole point. Every
 * value a console used to be given (the derived `publicUrl`, the canonicalized
 * `trustedOrigins`, a path made absolute against `rootPath`) is declared as a
 * `resolve` on the key itself in `@authup/server-config`, so a console
 * computes it from the document exactly as server-core does. A console
 * started through its own bin therefore gets the same configuration this
 * function produces, which is what makes it a service rather than something
 * the CLI has to assemble.
 *
 * The document is read once and every registry takes its own keys out of it;
 * the environment wins over the file, as it does everywhere else, and the two
 * passes are layered SECTION-AWARE, since a spread would let an environment
 * value for one key of a section replace the whole section the file supplied.
 */
export async function readConsoleConfigs(
    options: ConfigReadFsOptions<AuthupConfig>,
) : Promise<ConsoleConfigs> {
    const { tree } = await readConfigFileTree(options);

    const read = <T>(schema: SchemaInput<T>) : Partial<T> => mergeSchemaData<T>(
        schema,
        readSchemaFromFileTree<T>(tree, schema),
        readSchemaFromEnv<T>(schema),
    );

    return {
        auth: resolveAuthConsoleConfig(read<AuthConsoleConfigInput>(AUTH_CONSOLE_CONFIG_SCHEMA)),
        admin: resolveAdminConsoleConfig(read<AdminConsoleConfigInput>(ADMIN_CONSOLE_CONFIG_SCHEMA)),
        account: resolveAccountConsoleConfig(read<AccountConsoleConfigInput>(ACCOUNT_CONSOLE_CONFIG_SCHEMA)),
    };
}
