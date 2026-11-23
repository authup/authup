/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { schemas } from '../../../../src/core/query/module.ts';
import { decodeQuery } from '../../../../src/core/query/index.ts';
import { policySchema } from '../../../../src/core/entities/policy/schema.ts';
import { userSchema } from '../../../../src/core/entities/user/schema.ts';

/**
 * No entity has a JSON array column, so every schema declares
 * `filters.arrays: []`: an array operator on a scalar column is refused
 * at decode time instead of reaching an adapter that cannot render it.
 */
describe('core/query (array filters)', () => {
    it('should declare an empty arrays list on every schema', () => {
        const offenders = schemas
            .map((schema) => schema.describe())
            .filter((description) => !Array.isArray(description.filters?.arrays) || description.filters.arrays.length > 0)
            .map((description) => description.name);

        expect(schemas.length).toBeGreaterThan(0);
        expect(offenders).toEqual([]);
    });

    it.each([
        "size(name, '3')",
        "all(name, '1')",
        "elemMatch(name, eq(x, '1'))",
    ])('should refuse %s on a scalar column', async (filter) => {
        await expect(decodeQuery({ filter }, { schema: userSchema, throwOnFailure: true })).rejects.toThrow();
    });

    it('should still accept a filter across a relation', async () => {
        const query = await decodeQuery({ filter: "eq(children.name, 'a')" }, { schema: policySchema, throwOnFailure: true });

        expect(query.filters).toBeDefined();
    });
});
