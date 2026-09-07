/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createHash } from 'node:crypto';
import { describeSchemaRegistry } from './describe.ts';

/**
 * JSON with every object's keys in code-unit order, so a value hashes
 * identically however the producer happened to build it. Array order is
 * left alone: it is meaningful in a description (`indexes` names index
 * column sequences, `fields.default` a projection).
 */
function stableStringify(input: unknown) : string {
    if (Array.isArray(input)) {
        return `[${input.map(stableStringify).join(',')}]`;
    }

    if (input !== null && typeof input === 'object') {
        const record = input as Record<string, unknown>;
        const keys = Object.keys(record).sort();

        return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
    }

    return JSON.stringify(input) ?? 'null';
}

let value : string | undefined;

/**
 * A fingerprint of the whole queryable surface: the SHA-256 of every
 * registered schema's description. A client caches the descriptions it
 * read and compares this one value to learn whether any of them moved,
 * instead of diffing 26 documents; the same value is emitted into the
 * OpenAPI document as `x-authup-schema-hash`, so a document and a live
 * deployment can be told apart at a glance.
 *
 * Memoized, because the registry is populated once at module load and
 * every description is itself immutable and memoized.
 *
 * `node:crypto` rather than the `uncrypto` Web Crypto the rest of the
 * app hashes with: `subtle.digest` is async, and this value is read at
 * OpenAPI generation time from `trapi.config.ts`, which locter executes
 * through jiti — where a top-level `await` is a syntax error.
 */
export function computeSchemaRegistryHash() : string {
    if (typeof value === 'undefined') {
        value = createHash('sha256')
            .update(stableStringify(describeSchemaRegistry()))
            .digest('hex');
    }

    return value;
}
