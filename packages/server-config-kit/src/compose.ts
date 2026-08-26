/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { resolveSchemaPath } from './file.ts';
import type { ConfigSchemaEntryInput, ConfigSchemaInput } from './types.ts';

function defaultsAgree(a: unknown, b: unknown) : boolean {
    if (typeof a === 'function' || typeof b === 'function') {
        // A process-derived default is a closure, so the most two sides can
        // agree on is that both derive their value.
        return typeof a === 'function' && typeof b === 'function';
    }

    return JSON.stringify(a) === JSON.stringify(b);
}

// A zod type holds closures and is not value-comparable, so it is deliberately
// not part of the agreement check.
function assertEntriesAgree(
    key: string,
    a: ConfigSchemaEntryInput<any, any>,
    b: ConfigSchemaEntryInput<any, any>,
) : void {
    if (a.path !== b.path) {
        throw new Error(`The config key "${key}" is declared twice, at "${a.path}" and at "${b.path}".`);
    }

    if (a.env !== b.env) {
        throw new Error(`The config key "${key}" is declared twice, reading ${a.env ?? 'no environment variable'} and ${b.env ?? 'no environment variable'}.`);
    }

    if (!defaultsAgree(a.default, b.default)) {
        throw new Error(`The config key "${key}" is declared twice, with different defaults.`);
    }

    // The readers are module-level singletons, so reference equality is what
    // "the same reader" means. Two registries agreeing on the environment
    // variable and disagreeing here read one value differently: the strict
    // boolean reader throws on `REDIS_ENABLED=yes` where the lenient one
    // silently keeps the default.
    if (a.readEnv !== b.readEnv) {
        throw new Error(`The config key "${key}" is declared twice, reading ${a.env} with different readers.`);
    }
}

/**
 * One registry out of several, with every entry carrying its RESOLVED
 * absolute path, so the composed schema no longer depends on the prefix its
 * declaring package passed.
 *
 * A key two packages both read may be declared in both registries, as long
 * as the declarations agree on path, environment variable and default;
 * otherwise the two packages would read one configuration key differently.
 */
export function composeSchemas<T>(
    inputs: { prefix?: string, schema: ConfigSchemaInput<any> }[],
) : ConfigSchemaInput<T> {
    const composed : Record<string, ConfigSchemaEntryInput<any, any>> = {};

    for (const input of inputs) {
        const keys = Object.keys(input.schema);
        for (const key of keys) {
            const entry : ConfigSchemaEntryInput<any, any> = {
                ...input.schema[key],
                path: resolveSchemaPath(key, input.schema[key], input.prefix),
            };

            const existing = composed[key];
            if (existing) {
                assertEntriesAgree(key, existing, entry);
                continue;
            }

            composed[key] = entry;
        }
    }

    return composed as ConfigSchemaInput<T>;
}
