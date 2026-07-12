/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isEqual } from 'smob';

/**
 * Secret denylist for entity-diff keys (fail-closed: losing a
 * "secret_hashed flipped" diff entry is acceptable, leaking a hash is not).
 * Shared with the sanitizer's `diff` branch so both boundaries agree.
 */
export const EVENT_DIFF_SECRET_KEY_REGEX = /(password|secret|hash|token|credential)/i;

export const EVENT_DIFF_VALUE_MAX_LENGTH = 512;

export type EntityDiff = Record<string, { next: unknown, previous: unknown }>;

function isScalar(value: unknown): value is string | number | boolean | null {
    return value === null ||
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean';
}

function truncateScalar(value: string | number | boolean | null): string | number | boolean | null {
    if (typeof value === 'string' && value.length > EVENT_DIFF_VALUE_MAX_LENGTH) {
        return value.substring(0, EVENT_DIFF_VALUE_MAX_LENGTH);
    }

    return value;
}

/**
 * PII-safe scalar diff between the updated entity and its pre-mutation
 * snapshot: only keys with scalar values (string/number/boolean/null) on BOTH
 * sides, skipping timestamp columns (`*_at`) and any key matching the secret
 * denylist, including only keys whose value actually changed. String values
 * are truncated to {@link EVENT_DIFF_VALUE_MAX_LENGTH}.
 */
export function buildEntityDiff(
    next: Record<string, any>,
    previous: Record<string, any>,
): EntityDiff {
    const output: EntityDiff = {};

    const keys = new Set([
        ...Object.keys(next),
        ...Object.keys(previous),
    ]);

    for (const key of keys) {
        if (key.endsWith('_at')) {
            continue;
        }

        if (EVENT_DIFF_SECRET_KEY_REGEX.test(key)) {
            continue;
        }

        const nextValue = next[key];
        const previousValue = previous[key];

        if (!isScalar(nextValue) || !isScalar(previousValue)) {
            continue;
        }

        if (isEqual(nextValue, previousValue)) {
            continue;
        }

        output[key] = {
            next: truncateScalar(nextValue),
            previous: truncateScalar(previousValue),
        };
    }

    return output;
}
