/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import { TypedToken } from 'eldin';
import type { Config, ConfigSchemaDerivedKey } from './types.ts';
import type { ConfigSchema } from '@authup/server-config-kit';
import type { EnvironmentVariable } from '@authup/server-config';
import {
    ACCOUNT_CONSOLE_SECTION_CONFIG_SCHEMA,
    ADMIN_CONSOLE_SECTION_CONFIG_SCHEMA,
    AUTH_CONSOLE_SECTION_CONFIG_SCHEMA,
    CORE_CONFIG_SCHEMA,
    ROOT_CONFIG_SCHEMA,
} from '@authup/server-config';

export const ConfigInjectionKey = new TypedToken<Config>('Config');

/**
 * The keys this service reads, SELECTED out of the document schema by name.
 *
 * Nothing is declared here: a key's path, environment variable, default,
 * reader and zod type all travel with its one declaration in
 * `@authup/server-config`, so naming a key is the only thing that can go
 * wrong, and naming a key that does not exist fails the build. The mapped
 * ConfigSchema type is the other half of that guard: a {@link Config} key
 * with no entry fails the build too.
 *
 * The two whole-section spreads are the sections this service reads in full.
 * The five console keys are picked one by one, because a console section is
 * mostly the console service's own business (where it listens, which package
 * it serves); server-core only needs where a browser reaches it, and whether
 * a static console is served at all.
 */
export const CONFIG_SCHEMA: ConfigSchema<
    Config,
    ConfigSchemaDerivedKey,
    EnvironmentVariable
> = {
    ...ROOT_CONFIG_SCHEMA,
    ...CORE_CONFIG_SCHEMA,

    // where the hosted page GETs redirect to
    authConsoleUrl: AUTH_CONSOLE_SECTION_CONFIG_SCHEMA.authConsoleUrl,

    // where the server-side console login lands the browser, and whether that
    // login is minted at all
    adminConsoleUrl: ADMIN_CONSOLE_SECTION_CONFIG_SCHEMA.adminConsoleUrl,
    adminConsoleEnabled: ADMIN_CONSOLE_SECTION_CONFIG_SCHEMA.adminConsoleEnabled,
    accountConsoleUrl: ACCOUNT_CONSOLE_SECTION_CONFIG_SCHEMA.accountConsoleUrl,
    accountConsoleEnabled: ACCOUNT_CONSOLE_SECTION_CONFIG_SCHEMA.accountConsoleEnabled,
};
