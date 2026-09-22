/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isParseError } from '@rapiq/core';
import { describe, expect, it } from 'vitest';
import { schemas } from '../../../../src/core/query/module.ts';
import { TIMESTAMP_FILTER_KEYS, decodeQuery } from '../../../../src/core/query/index.ts';

const VALUE = '2026-01-01T00:00:00.000Z';

/**
 * Every (schema, timestamp key) pair the filter allow-lists admit. Derived
 * from the descriptions, so the guard below keeps it from going vacuous.
 */
const PAIRS = schemas.flatMap((schema) => {
    const description = schema.describe();
    return (description.filters?.allowed || [])
        .filter((key: string) => TIMESTAMP_FILTER_KEYS.includes(key))
        .map((key: string) => [description.name, key] as [string, string]);
});

async function decode(schema: string, key: string, value: string) {
    return decodeQuery({ filter: { [key]: value } }, { schema });
}

describe('core/query (timestamp filters)', () => {
    it('should admit createdAt on every schema', () => {
        const names = new Set(PAIRS.filter(([, key]) => key === 'createdAt').map(([name]) => name));

        expect(names.size).toEqual(schemas.length);
    });

    it.each(PAIRS)('should accept a range on %s.%s', async (schema, key) => {
        for (const prefix of ['<', '<=', '>', '>=']) {
            const query = await decode(schema, key, `${prefix}${VALUE}`);
            expect(query.filters).toBeDefined();
        }
    });

    it.each(PAIRS)('should refuse equality on %s.%s', async (schema, key) => {
        for (const value of [VALUE, `!${VALUE}`, `${VALUE},${VALUE}`]) {
            const error = await decode(schema, key, value).catch((e) => e);
            expect(isParseError(error)).toBe(true);
            expect(error.issues.map((issue: { message: string }) => issue.message).join()).toContain('range operators');
        }
    });
});
