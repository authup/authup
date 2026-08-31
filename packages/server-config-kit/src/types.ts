/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { z } from 'zod';

export type SchemaEnvReader = (raw: string, name: string) => unknown;

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
export type SchemaEntry<
    T,
    KEY extends keyof T,
    DEFAULT_KEY extends keyof T = never,
    ENV_KEY extends string = string,
> = {
    type: z.ZodType<T[KEY]>,
    description: string,
    /**
     * The absolute dotted location of the key in the configuration document.
     * Absent means it is derived from the key name, or from the section the
     * entry was declared in (see `withSectionPaths`).
     */
    path?: string,
    /**
     * The declarations this key FALLS BACK to, read in order once its own
     * location and variable say nothing: a console's `host` inherits the
     * deployment-wide one rather than repeating its path and variable.
     *
     * An alternative is another key's real declaration, never a copy of it,
     * so the two cannot drift. Only the key's own location and variable are
     * published in the JSON Schema: an alternative belongs to the key that
     * declares it, and is documented there.
     */
    alt?: SchemaEntry<{
        [Key in KEY]: T[KEY]
    }, KEY> | SchemaEntry<{
        [Key in KEY]: T[KEY]
    }, KEY>[]
} & (KEY extends DEFAULT_KEY ?
    { default?: undefined } :
    { default: T[KEY] | (() => T[KEY]) }
) & (
    { env: ENV_KEY, readEnv: SchemaEnvReader } |
    { env?: undefined, readEnv?: undefined }
);

/**
 * `-?` strips the optional modifier an optional key would otherwise carry
 * over: every key needs an entry, derived or not.
 */
/**
 * Whether a key's value could be described by a nested SCHEMA rather than by
 * one entry: only a plain object could, so a string, a number, a boolean, an
 * array or a union of them leaves the entry as the sole possibility.
 *
 * The `[V]` tuple stops the check distributing over a union, which is what a
 * key like `redis` (a URL, a boolean or an options object) needs: distributed,
 * its object arm alone would make the key ambiguous.
 */
type IsSchema<V> = [V] extends [readonly any[]] ?
    false :
    [V] extends [Record<string, any>] ? true : false;

export type Schema<
    T,
    D extends keyof T = never,
    E extends string = string,
> = {
    [K in keyof T]-?: IsSchema<T[K]> extends true ?
        SchemaEntry<T, K, D, E> | Schema<T[K], never, E> :
        SchemaEntry<T, K, D, E>
};

/**
 * The loose consumption shape the helpers take. Every strict schema is
 * assignable to it, so a helper needs to know neither which keys are
 * derived nor which environment variable names exist.
 */
export type SchemaEntryInput<T, K extends keyof T> = {
    type: z.ZodType,
    description: string,
    path?: string,
    default?: T[K] | (() => T[K]),
    env?: string,
    readEnv?: SchemaEnvReader,
    alt?: SchemaEntryInput<{
        [Key in K]: T[K]
    }, K> | SchemaEntryInput<{
        [Key in K]: T[K]
    }, K>[]
};

export type SchemaInput<T> = {
    [K in keyof T]-?: IsSchema<T[K]> extends true ?
        SchemaEntryInput<T, K> | SchemaInput<T[K]> :
        SchemaEntryInput<T, K>
};

export type SchemaDefineOptions = {
    pathPrefix?: string
};
