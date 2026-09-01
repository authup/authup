/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import { TypedToken } from 'eldin';
import type { Config, ConfigSchemaDerivedKey } from './types.ts';
import type { Schema } from '@authup/server-config-kit';
import { defineSchema } from '@authup/server-config-kit';
import type { EnvironmentVariable } from '@authup/server-config';
import {
    ACCOUNT_CONSOLE_SCHEMA,
    ADMIN_CONSOLE_SCHEMA,
    AUTH_CONSOLE_SCHEMA,
    CORE_SCHEMA,
    ROOT_SCHEMA,
    SECTION_KEY,
} from '@authup/server-config';

export const ConfigInjectionKey = new TypedToken<Config>('Config');

/**
 * The keys this service reads, SELECTED out of the document schema by name.
 *
 * Nothing is declared here: a key's path, environment variable, default,
 * reader and zod type all travel with its one declaration in
 * `@authup/server-config`, so naming a key is the only thing that can go
 * wrong, and naming a key that does not exist fails the build. The mapped
 * Schema type is the other half of that guard: a {@link Config} key
 * with no entry fails the build too.
 *
 * The two whole-section spreads are the sections this service reads in full,
 * so their keys are flat and read in this service's own vocabulary. The five
 * console keys stay nested under the console they belong to, since three
 * consoles each declare a `url`. They are picked one by one rather than
 * spread because a console section is mostly the console service's own
 * business (where it listens, which package it serves); server-core only
 * needs where a browser reaches it, and whether a static console is served
 * at all.
 */
export const CONFIG_SCHEMA: Schema<
    Config,
    ConfigSchemaDerivedKey,
    EnvironmentVariable
> = {
    ...ROOT_SCHEMA,
    ...CORE_SCHEMA,

    // where the hosted page GETs redirect to
    [SECTION_KEY.AUTH_CONSOLE]: defineSchema({ url: AUTH_CONSOLE_SCHEMA.url }),

    // where the server-side console login lands the browser, and whether that
    // login is minted at all
    [SECTION_KEY.ADMIN_CONSOLE]: defineSchema({
        url: ADMIN_CONSOLE_SCHEMA.url,
        enabled: ADMIN_CONSOLE_SCHEMA.enabled,
    }),
    [SECTION_KEY.ACCOUNT_CONSOLE]: defineSchema({
        url: ACCOUNT_CONSOLE_SCHEMA.url,
        enabled: ACCOUNT_CONSOLE_SCHEMA.enabled,
    }),
};
