/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { INSTANCEOF_PROPERTY, hasInstanceof, isObject } from '@ebec/core';

/**
 * Serialize the input's `@instanceof` class-marker chain to its string form.
 *
 * The runtime chain is a `symbol[]` of `Symbol.for(...)` markers — one per
 * class in the inheritance path. Symbols are dropped by `JSON.stringify`, so
 * `AuthupError.toJSON()` emits the chain as the markers' description strings
 * instead, keeping the ancestor information available after a JSON round-trip.
 *
 * String entries pass through unchanged (a rehydrated chain re-serializes
 * losslessly); anything else is dropped.
 */
export function serializeInstanceofChain(input: unknown): string[] {
    if (!isObject(input)) {
        return [];
    }

    const chain = input[INSTANCEOF_PROPERTY];
    if (!Array.isArray(chain)) {
        return [];
    }

    const output: string[] = [];
    for (const entry of chain) {
        if (typeof entry === 'symbol') {
            if (entry.description) {
                output.push(entry.description);
            }
        } else if (typeof entry === 'string') {
            output.push(entry);
        }
    }

    return output;
}

/**
 * Check whether the input's `@instanceof` chain carries `marker` — either as
 * the native registry symbol (an in-process instance) or as the symbol's
 * description string (an error rehydrated from the JSON emitted by
 * `AuthupError.toJSON()`).
 *
 * Prefer this over `hasInstanceof` as the fast path of duck-type guards:
 * plain `hasInstanceof` only matches the symbol form, so a guard using it
 * loses the inheritance match for JSON-rehydrated subclass errors and falls
 * through to its leaf-only `code` comparison.
 */
export function matchesInstanceof(input: unknown, marker: symbol): boolean {
    if (hasInstanceof(input, marker)) {
        return true;
    }

    if (!isObject(input)) {
        return false;
    }

    const chain = input[INSTANCEOF_PROPERTY];
    return Array.isArray(chain) &&
        typeof marker.description === 'string' &&
        chain.includes(marker.description);
}
