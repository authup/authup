/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isSchemaEntryInput } from '../entry/index.ts';
import { assertSchemaValue, isSchemaInput } from '../schema/check.ts';
import type { SchemaEntryInput, SchemaInput } from '../types.ts';

type Slot = {
    entry: SchemaEntryInput<any, any>,
    container: Record<string, unknown>,
    key: string,
};

/**
 * Every entry of a registry, indexed by the absolute document path it reads
 * from, paired with the place in the VALUE its result belongs.
 *
 * A registry is shaped like the config while the document is addressed by
 * path, so the index is what lets one key reach another regardless of how the
 * reading service selected it: server-core spreads a section flat, a console
 * nests it, and `core.port` means the same location to both.
 */
function indexByPath<T>(
    schema: SchemaInput<T>,
    data: Record<string, unknown>,
    slots: Map<string, Slot>,
) : void {
    const keys = Object.keys(schema) as (keyof T)[];
    for (const key of keys) {
        const entry = schema[key];
        const name = key as string;

        if (isSchemaEntryInput(entry)) {
            slots.set(entry.path || name, {
                entry, 
                container: data, 
                key: name, 
            });
            continue;
        }

        if (isSchemaInput(entry)) {
            const nested = (data[name] ??= {}) as Record<string, unknown>;
            indexByPath<any>(entry, nested, slots);
            continue;
        }

        assertSchemaValue(name);
    }
}

/**
 * Run every entry's `resolve` over already-merged data, so a key derived from
 * other keys is computed once, by the registry that declares it, for every
 * service that reads the document.
 *
 * This is the pass that makes normalization a property of the DOCUMENT rather
 * than of whichever service happens to run first. Before it, a derived value
 * (the issuer url, the canonicalized trusted origins, a console's own url)
 * was produced by server-core and handed to the consoles, so a console
 * started on its own got a half-normalized document and no error to show for
 * it.
 *
 * Resolution is LAZY and memoized rather than topologically sorted: a
 * resolver asks for what it needs and gets it resolved, so the declaration
 * order of a registry never matters and a section can be composed into
 * another service's selection without re-ordering anything. A cycle throws,
 * naming the chain, because the alternative is a value that is silently
 * undefined.
 */
export function resolveSchemaData<T>(
    schema: SchemaInput<T>,
    data: Partial<T>,
) : Partial<T> {
    const output = { ...data } as Record<string, unknown>;

    const slots = new Map<string, Slot>();
    indexByPath(schema, output, slots);

    const resolved = new Set<string>();
    const visiting : string[] = [];

    const get = (path: string) : unknown => {
        const slot = slots.get(path);
        if (!slot) {
            throw new Error(
                `The config key "${path}" is not part of this registry, so a resolver cannot read it. ` +
                'Select the section that declares it, or reference a key this service reads.',
            );
        }

        if (resolved.has(path)) {
            return slot.container[slot.key];
        }

        if (visiting.includes(path)) {
            throw new Error(
                `The config keys ${[...visiting, path].map((p) => `"${p}"`).join(' -> ')} resolve in a cycle.`,
            );
        }

        visiting.push(path);
        try {
            if (slot.entry.resolve) {
                slot.container[slot.key] = slot.entry.resolve({
                    value: slot.container[slot.key],
                    get,
                });
            }

            resolved.add(path);
        } finally {
            visiting.pop();
        }

        return slot.container[slot.key];
    };

    for (const path of slots.keys()) {
        get(path);
    }

    return output as Partial<T>;
}
