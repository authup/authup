/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { z } from 'zod';

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
    K extends keyof T,
    D extends keyof T = never,
    E extends string = string,
> = {
    type: z.ZodType<T[K]>,
    description: string,
    /**
     * The absolute dotted location of the key in the configuration document.
     * Absent means it is derived from the pass prefix and the key name.
     */
    path?: string,
} & (K extends D ?
    { default?: undefined } :
    { default: T[K] | (() => T[K]) }
) & (
    { env: E, readEnv: ConfigSchemaEnvReader } |
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
> = { [K in keyof T]-?: ConfigSchemaEntry<T, K, D, E> };

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
    readEnv?: ConfigSchemaEnvReader
};

export type ConfigSchemaInput<T> = { [K in keyof T]-?: ConfigSchemaEntryInput<T, K> };
