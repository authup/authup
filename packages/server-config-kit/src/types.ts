/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { z } from 'zod';
import type { ObjectLiteral } from '@authup/kit';

export type ConfigSchemaEnvReader = (raw: string, name: string) => unknown;

/**
 * The strict declaration shape a registry is written in: every key needs an
 * entry, a default is required unless K is one of the derived keys D, env
 * and readEnv are paired, and E narrows the environment variable name type.
 *
 * `type` is bound to the key's own output (`z.ZodType<T[K]>`) rather than a
 * bare `z.ZodType`, so an entry whose schema parses to the wrong type fails
 * the build where it is declared. Unbound, a `port: z.string()` would
 * compile and only surface as a rejected value at runtime.
 */
export type ConfigSchemaEntry<
    T,
    KEY extends keyof T,
    DEFAULT_KEY extends keyof T = never,
    ENV_KEY extends string = string,
> = {
    type: z.ZodType<T[KEY]>,
    description: string,
    /**
     * The absolute dotted location of the key in the configuration document.
     * Absent means it is derived from the pass prefix and the key name.
     *
     * A LIST is a fallback chain, read in order, first defined wins: the
     * key's own location, then the deployment-wide one it inherits from when
     * the document says nothing about it (`server.adminConsole.host`, then
     * `host`). Every location in the chain counts as claimed, so a document
     * writing the shared one is not reported as unread; only the first is
     * published in the JSON Schema, since that is where the key belongs.
     */
    path?: string,
    alt?: ConfigSchemaEntry<{
        [Key in KEY]: T[KEY]
    }, KEY> | ConfigSchemaEntry<{
        [Key in KEY]: T[KEY]
    }, KEY>[]
} & (KEY extends DEFAULT_KEY ?
    { default?: undefined } :
    { default: T[KEY] | (() => T[KEY]) }
) & (
    /**
     * A list is a fallback chain here too, read in the same order as the
     * paths above (`ADMIN_CONSOLE_HOST`, then `HOST`). Only the first name is
     * this key's own: the rest belong to the keys they are borrowed from, so
     * a registry still maps each variable onto exactly one key.
     */
    { env: ENV_KEY, readEnv: ConfigSchemaEnvReader } |
    { env?: undefined, readEnv?: undefined }
);

/**
 * `-?` strips the optional modifier an optional key would otherwise carry
 * over: every key needs an entry, derived or not.
 */
export type ConfigSchema<
    T,
    D extends keyof T = never,
    E extends string = string,
> = {
    [K in keyof T]-?: T[K] extends ObjectLiteral ?
        ConfigSchemaEntry<T, K, D, E> | ConfigSchema<T[K]> :
        ConfigSchemaEntry<T, K, D, E>
};

/**
 * The loose consumption shape the helpers take. Every strict schema is
 * assignable to it, so a helper needs to know neither which keys are
 * derived nor which environment variable names exist.
 */
export type ConfigSchemaEntryInput<T, K extends keyof T> = {
    type: z.ZodType,
    description: string,
    path?: string,
    default?: T[K] | (() => T[K]),
    env?: string,
    readEnv?: ConfigSchemaEnvReader,
    alt?: ConfigSchemaEntryInput<{
        [Key in K]: T[K]
    }, K> | ConfigSchemaEntryInput<{
        [Key in K]: T[K]
    }, K>[]
};

export type ConfigSchemaInput<T> = {
    [K in keyof T]-?: T[K] extends ObjectLiteral ?
        ConfigSchemaInput<T[K]> | ConfigSchemaEntryInput<T, K> :
        ConfigSchemaEntryInput<T, K>
};
