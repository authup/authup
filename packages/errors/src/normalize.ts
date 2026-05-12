/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isError } from './check.ts';

/**
 * Normalize a thrown value into a plain object suitable for inclusion in
 * a JSON response body (or any serialization boundary).
 *
 * Duck-typed: if the input exposes a `toJSON()` returning an object, use
 * it. That preserves every attribute the error chose to surface — `code`,
 * `cause`, `errors`, `issues`, `data`, AuthupError sub-class fields, ... —
 * including any class that implements `toJSON`. The guard does not pin
 * to `instanceof Error`; cross-realm boundaries (worker threads,
 * dynamic-import duplicate copies) can break `instanceof` even for our
 * own classes.
 *
 * Fall back to a `name` / `message` snapshot for plain Error instances,
 * spreading enumerable own properties so any caller-attached fields
 * survive. Non-Error inputs collapse to `{ message: String(input) }`.
 */
export function normalizeError(input: unknown): Record<string, any> {
    if (input && typeof (input as { toJSON?: unknown }).toJSON === 'function') {
        const json = (input as { toJSON(): unknown }).toJSON();
        if (json && typeof json === 'object' && !Array.isArray(json)) {
            return json as Record<string, any>;
        }
    }

    if (isError(input)) {
        return {
            ...input,
            name: input.name,
            message: input.message,
        };
    }

    if (typeof input === 'string') {
        return { message: input };
    }

    return { message: String(input) };
}
