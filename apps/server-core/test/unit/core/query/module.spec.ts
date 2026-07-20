/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ICondition } from '@rapiq/core';
import {
    FilterCompoundOperator, 
    eq, 
    isFilter, 
    isFilters,
} from '@rapiq/core';
import { describe, expect, it } from 'vitest';
import { roleSchema } from '../../../../src/core/entities/role/schema.ts';
import { appendQueryConditions, decodeQuery } from '../../../../src/core/query/index.ts';

function collectFieldConditions(condition: ICondition): [string, unknown][] {
    if (isFilters(condition)) {
        return condition.value.flatMap((child) => collectFieldConditions(child));
    }

    if (isFilter(condition)) {
        return [[condition.field, condition.value]];
    }

    return [];
}

describe('core/query', () => {
    it('should decode bracket and expression dialects into the same condition', () => {
        const bracket = decodeQuery({ filter: { name: 'admin' } }, { schema: roleSchema });
        const expression = decodeQuery(
            { codec: 'url-expression', filter: "eq(name,'admin')" },
            { schema: roleSchema },
        );

        expect(collectFieldConditions(bracket.filters)).toEqual([['name', 'admin']]);
        expect(collectFieldConditions(expression.filters)).toEqual([['name', 'admin']]);
    });

    it('should neither parse nor default masked parameters', () => {
        const parsed = decodeQuery(
            { filter: { name: 'admin' }, page: { limit: 10 } },
            { schema: roleSchema, parameters: ['filters'] },
        );

        expect(collectFieldConditions(parsed.filters)).toEqual([['name', 'admin']]);
        expect(parsed.pagination.limit).toBeUndefined();
        expect(parsed.pagination.offset).toBeUndefined();
    });

    it('should append conditions without displacing client conditions', () => {
        const parsed = decodeQuery({ filter: { realmId: 'client-realm' } }, { schema: roleSchema });

        const result = appendQueryConditions(parsed, eq('realmId', 'route-realm'));

        expect(isFilters(result.filters, FilterCompoundOperator.AND)).toBe(true);
        expect(collectFieldConditions(result.filters)).toEqual([
            ['realmId', 'client-realm'],
            ['realmId', 'route-realm'],
        ]);
        // immutable: the input query keeps its own filter tree
        expect(collectFieldConditions(parsed.filters)).toEqual([['realmId', 'client-realm']]);
    });

    it('should append onto an empty filter tree', () => {
        const parsed = decodeQuery({}, { schema: roleSchema });

        const result = appendQueryConditions(parsed, eq('realmId', 'route-realm'));

        expect(collectFieldConditions(result.filters)).toEqual([['realmId', 'route-realm']]);
    });

    it('should carry the other parameter nodes over by reference', () => {
        const parsed = decodeQuery(
            { page: { limit: 10 }, sort: '-name' },
            { schema: roleSchema },
        );

        const result = appendQueryConditions(parsed, eq('realmId', 'route-realm'));

        expect(result).not.toBe(parsed);
        expect(result.fields).toBe(parsed.fields);
        expect(result.relations).toBe(parsed.relations);
        expect(result.pagination).toBe(parsed.pagination);
        expect(result.sorts).toBe(parsed.sorts);
        expect(result.pagination.limit).toEqual(10);
    });
});
