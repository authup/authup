/*
 * Copyright (c) 2026.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import { isObject } from '@authup/kit';

const SNAKE_KEY_PATTERN = /^[a-z0-9]+(_[a-z0-9]+)+$/;

function snakeToCamel(input: string): string {
    return input.replace(/_([a-z0-9])/g, (_, character: string) => character.toUpperCase());
}

export type ProvisioningKeyNormalizationResult = {
    data: unknown,
    convertedKeys: Set<string>,
    staleNameValues: Set<string>,
};

function normalize(
    input: unknown,
    output: Pick<ProvisioningKeyNormalizationResult, 'convertedKeys' | 'staleNameValues'>,
): unknown {
    if (Array.isArray(input)) {
        return input.map((item) => normalize(item, output));
    }

    if (!isObject(input)) {
        return input;
    }

    const result: Record<string, unknown> = {};
    for (const key of Object.keys(input)) {
        let nextKey = key;
        if (SNAKE_KEY_PATTERN.test(key)) {
            const camelKey = snakeToCamel(key);
            if (camelKey in input) {
                output.convertedKeys.add(`${key} (dropped, ${camelKey} present)`);
                continue;
            }

            nextKey = camelKey;
            output.convertedKeys.add(`${key} -> ${camelKey}`);
        }

        // An attribute-names policy denylist enumerates entity property
        // names; a stale snake entry silently never matches the camelCase
        // ATTRIBUTES bag (fail-open), so surface it — values are user
        // vocabulary and are deliberately NOT rewritten.
        if (
            nextKey === 'names' &&
            Array.isArray(input[key])
        ) {
            for (const entry of input[key] as unknown[]) {
                if (typeof entry === 'string' && SNAKE_KEY_PATTERN.test(entry)) {
                    output.staleNameValues.add(entry);
                }
            }
        }

        result[nextKey] = normalize(input[key], output);
    }

    return result;
}

export function normalizeProvisioningEntityKeys(input: unknown): ProvisioningKeyNormalizationResult {
    const output: ProvisioningKeyNormalizationResult = {
        data: undefined,
        convertedKeys: new Set<string>(),
        staleNameValues: new Set<string>(),
    };

    output.data = normalize(input, output);

    return output;
}
