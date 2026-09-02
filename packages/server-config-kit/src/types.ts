/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { z } from 'zod';

export type SchemaEnvReader = (raw: string, name: string) => unknown;

export type SchemaResolveContext = {
    /**
     * What defaults, the file and the environment produced for this key.
     * Deliberately `unknown` rather than `T[K]`: the context is referenced
     * from both entry shapes, and threading the key's type through both
     * pushes the comparison past TS's depth limit. The RETURN type still
     * carries it, which is the half that catches a resolver producing the
     * wrong thing.
     */
    value: unknown,
    /**
     * Any other key of the document, by its absolute dotted path. Resolved on
     * demand, so the declaration order of a registry never matters; a
     * reference cycle throws rather than deadlocking or returning undefined.
     */
    get: (path: string) => unknown,
};

export type SchemaEntryResolver<V> = (ctx: SchemaResolveContext) => V;

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
     * entry was declared in (see `defineSchema`'s `pathPrefix`).
     */
    path?: string,
    /**
     * Derive this key from the document, after the passes have merged.
     *
     * `value` is what defaults, file and environment produced, and `get`
     * reaches ANY other key by its absolute document path, resolving it
     * first if it derives too. So normalization is declared next to the key
     * it normalizes, and every service reading the same document computes
     * the same answer without calling anything itself:
     *
     *   publicUrl:      ({ value, get }) => value ?? derive(get('core.host'), …)
     *   url (console):  ({ value, get }) => value || `${get('publicUrl')}/console/account`
     *
     * By PATH rather than by entry reference: {@link defineSchema} clones an
     * entry when it stamps a path prefix, so an object held from elsewhere is
     * not the object in the schema, and a service composes its own selection
     * by spreading, which flattens sections. The absolute path is the one
     * address that survives both.
     */
    resolve?: SchemaEntryResolver<T[KEY]>
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
    resolve?: SchemaEntryResolver<T[K]>
};

export type SchemaInput<T> = {
    [K in keyof T]-?: IsSchema<T[K]> extends true ?
        SchemaEntryInput<T, K> | SchemaInput<T[K]> :
        SchemaEntryInput<T, K>
};

export type SchemaDefineOptions = {
    pathPrefix?: string
};
