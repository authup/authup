/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { buildQueryString } from '@authup/core-http-kit';
import type { Path } from '@authup/core-kit';
import { defineQuery } from '@rapiq/core';
import { describe, expect, it } from 'vitest';
import {
    buildPathCollectionFilters,
    buildPathScopeFilters,
    readPathScopeQuery,
} from '../../src/composables/path-scope';

const SALES_ID = '1f9b2c6d-8a4e-4c1b-9f2a-6d3e5c7b8a90';
const BERLIN_ID = '2a8c3d7e-9b5f-4d2c-8e3b-7f4a6b5c9d01';
const REALM_ID = '3b7d4e8f-0c6a-4e3d-9f1b-8a2c5d7e4f12';

/** The filter as it travels, so the assertions read like the wire. */
function encodeFilters(filters: ReturnType<typeof buildPathCollectionFilters>) : string {
    return decodeURIComponent(buildQueryString(defineQuery<Path>({ filters })));
}

describe('src/composables/path-scope -> readPathScopeQuery', () => {
    it('should read a folder path from the route query', () => {
        expect(readPathScopeQuery('sales/berlin')).toBe('sales/berlin');
    });

    it('should read an absent, empty or repeated parameter as no scope', () => {
        expect(readPathScopeQuery(undefined)).toBeNull();
        expect(readPathScopeQuery(null)).toBeNull();
        expect(readPathScopeQuery('')).toBeNull();
        expect(readPathScopeQuery(['sales', 'berlin'])).toBeNull();
    });
});

describe('src/composables/path-scope -> buildPathScopeFilters', () => {
    it('should contribute no filter at all without a scope', () => {
        expect(buildPathScopeFilters(null, [])).toEqual({});
        expect(buildPathScopeFilters(null, [{ id: SALES_ID }])).toEqual({});
    });

    it('should filter by the folder and every folder below it', () => {
        expect(buildPathScopeFilters('sales', [
            { id: SALES_ID },
            { id: BERLIN_ID },
        ])).toEqual({ pathId: [SALES_ID, BERLIN_ID] });
    });

    // rapiq encodes an empty list as `in(pathId)`, a constant false, so an
    // unknown folder lists nothing. Dropping the key would list every row.
    it('should list nothing for a folder that resolved to nothing', () => {
        expect(buildPathScopeFilters('unknown', [])).toEqual({ pathId: [] });
    });
});

describe('src/composables/path-scope -> buildPathCollectionFilters', () => {
    it('should list every folder of the realm without a folder in the route', () => {
        expect(encodeFilters(buildPathCollectionFilters(null, REALM_ID)))
            .toBe(`?codec=url-expression&filter=eq(realmId,'${REALM_ID}')`);
    });

    // The realm stays ANDed on, since a folder path is unique per realm
    // only. The exact leg reaches the folder itself and the prefix leg its
    // descendants; the prefix carries the separator, so a sibling merely
    // sharing it (`sales/berlin2`) is out of reach. Both legs compare the
    // derived `path` column, which the folders table indexes.
    it('should narrow to the folder and the subtree below it', () => {
        expect(encodeFilters(buildPathCollectionFilters('sales/berlin', REALM_ID)))
            .toBe(`?codec=url-expression&filter=and(eq(realmId,'${REALM_ID}'),or(eq(path,'sales/berlin'),startsWith(path,'sales/berlin/')))`);
    });

    // A folder always belongs to a realm, so a bound `null` matches none of
    // them. Dropping the leg instead would list every realm's folders.
    it('should keep the realm leg when no realm is known', () => {
        expect(encodeFilters(buildPathCollectionFilters(null, null)))
            .toBe('?codec=url-expression&filter=eq(realmId,null)');
    });
});
