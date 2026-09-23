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
    PATH_SCOPE_ID_LIMIT,
    PATH_SCOPE_LIMIT,
    PATH_SCOPE_PAGE_LIMIT,
    PATH_TREE_LIMIT,
    buildPathCollectionFilters,
    buildPathScopeFilters,
    collectPathPages,
    readPathScopeQuery,
    reloadCollection,
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
        expect(readPathScopeQuery(' Sales/Berlin ')).toBe('sales/berlin');
        expect(readPathScopeQuery('  ')).toBeNull();
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

    // The ids are known to be incomplete there, so narrowing by them would
    // drop rows with no error: the unnarrowed list plus the page's notice is
    // the honest answer.
    it('should narrow nothing for a subtree that outgrew the page ceiling', () => {
        expect(buildPathScopeFilters('sales', [{ id: SALES_ID }], true)).toEqual({});
    });
});

/** A folder page in the shape the collection response carries. */
function createPathPages(total: number) {
    const pages = {
        offsets: [] as number[],
        async load(offset: number) {
            pages.offsets.push(offset);

            const data = Array.from(
                { length: Math.max(Math.min(PATH_SCOPE_LIMIT, total - offset), 0) },
                (_, index) => ({ id: `${offset + index}` } as Path),
            );

            return {
                data,
                meta: { total },
            };
        },
    };

    return pages;
}

describe('src/composables/path-scope -> collectPathPages', () => {
    it('should stop after one page when it holds the whole subtree', async () => {
        const pages = createPathPages(3);

        const result = await collectPathPages(pages.load);

        expect(result.data).toHaveLength(3);
        expect(result.truncated).toBe(false);
        expect(pages.offsets).toEqual([0]);
    });

    // One request cannot answer a subtree: the limit is the server's own
    // maxLimit, so a short id list would drop rows out of the scoped list
    // with no error and a plausible-looking total.
    it('should assemble the pages of a subtree larger than one page', async () => {
        const pages = createPathPages(PATH_SCOPE_LIMIT + 2);

        const result = await collectPathPages(pages.load);

        expect(result.data).toHaveLength(PATH_SCOPE_LIMIT + 2);
        expect(result.truncated).toBe(false);
        expect(pages.offsets).toEqual([0, PATH_SCOPE_LIMIT]);
    });

    // The id budget is the ceiling that fires first: the ids travel as one
    // `IN` in a query string, so a longer list would only build a filter the
    // server refuses before routing it.
    it('should report a subtree that outgrew the id ceiling as truncated', async () => {
        const pages = createPathPages(PATH_SCOPE_LIMIT * PATH_SCOPE_PAGE_LIMIT + 1);

        const result = await collectPathPages(pages.load);

        expect(result.truncated).toBe(true);
        expect(result.data.length).toBeGreaterThanOrEqual(PATH_SCOPE_ID_LIMIT);
        expect(result.data.length).toBeLessThan(PATH_SCOPE_LIMIT * PATH_SCOPE_PAGE_LIMIT);

        // and the scope then narrows nothing at all
        expect(buildPathScopeFilters('sales', result.data, result.truncated)).toEqual({});
    });

    // both ceilings hold: a subtree that fits the id budget but not the page
    // budget would need a page wider than the server's own maxLimit
    it('should stop at the page ceiling as well', () => {
        expect(PATH_SCOPE_ID_LIMIT).toBeLessThanOrEqual(PATH_SCOPE_LIMIT * PATH_SCOPE_PAGE_LIMIT);
    });

    it('should not truncate a subtree that exactly fills the id budget', async () => {
        const pages = createPathPages(PATH_SCOPE_ID_LIMIT);

        const result = await collectPathPages(pages.load);

        expect(result.truncated).toBe(false);
        expect(result.data).toHaveLength(PATH_SCOPE_ID_LIMIT);
    });

    // The pane builds no `IN`, so the id budget is not its ceiling: cutting
    // the tree at 300 would hide folders a visitor can otherwise reach, where
    // a short id list would have listed the wrong rows.
    it('should walk past the id ceiling for the tree pane', async () => {
        const pages = createPathPages(PATH_SCOPE_ID_LIMIT + 10);

        const result = await collectPathPages(pages.load, PATH_TREE_LIMIT);

        expect(result.truncated).toBe(false);
        expect(result.data).toHaveLength(PATH_SCOPE_ID_LIMIT + 10);
    });

    it('should still bound the tree pane by the page ceiling', async () => {
        const pages = createPathPages(PATH_TREE_LIMIT + 1);

        const result = await collectPathPages(pages.load, PATH_TREE_LIMIT);

        expect(result.truncated).toBe(true);
        expect(result.data).toHaveLength(PATH_TREE_LIMIT);
    });

    it('should stop on an empty page rather than trust the reported total', async () => {
        const pages = {
            offsets: [] as number[],
            async load(offset: number) {
                pages.offsets.push(offset);
                return {
                    data: [],
                    meta: { total: 500 },
                };
            },
        };

        const result = await collectPathPages(pages.load);

        expect(result.data).toHaveLength(0);
        expect(result.truncated).toBe(false);
        expect(pages.offsets).toEqual([0]);
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

    // What the folder collection page watches: leaving `?path=` behind is a
    // query-only navigation, which vue-router answers by reusing the page,
    // so the filter changing is the only signal a reload can hang on.
    it('should differ between a scoped and an unscoped route value', () => {
        expect(encodeFilters(buildPathCollectionFilters('sales', REALM_ID)))
            .not.toBe(encodeFilters(buildPathCollectionFilters(null, REALM_ID)));
    });
});

/**
 * A collection stub in the shape the manager exposes: `load` refuses while
 * another load is in flight (silently, like the real one), and a completed
 * load reassigns `data`.
 */
/**
 * A collection that is busy for `busyRounds` polls before it goes idle, the
 * shape the kit collection exposes (`load` plus the `busy` flag that says
 * whether a `load` would be taken at all).
 */
function createCollection(options: { busyRounds?: number } = {}) {
    let busyRounds = options.busyRounds ?? 0;

    const collection = {
        calls: 0,
        get busy() {
            if (busyRounds > 0) {
                busyRounds -= 1;
                return true;
            }

            return false;
        },
        async load() {
            collection.calls += 1;
        },
    };

    return collection;
}

describe('src/composables/path-scope -> reloadCollection', () => {
    it('should ask an idle collection exactly once', async () => {
        const collection = createCollection();

        await reloadCollection(() => collection);

        expect(collection.calls).toBe(1);
    });

    // The ordinary case: the folder settles while the list is still
    // fetching the rows it mounted with, and a `load` issued then is
    // silently dropped. Waiting for idle is what makes the narrowed query
    // actually reach the server.
    it('should wait for a busy collection and then ask exactly once', async () => {
        const collection = createCollection({ busyRounds: 2 });

        await reloadCollection(() => collection);

        expect(collection.calls).toBe(1);
    });

    // The wait has no deadline, so the one thing that must end it is the
    // page going away: an unmounted collection hands back null and the
    // wait stops there rather than polling a page nobody is looking at.
    it('should stop waiting once the collection is gone', async () => {
        const collection = createCollection({ busyRounds: 10 });
        let mounted = true;

        const reload = reloadCollection(() => (mounted ? collection : null));

        mounted = false;

        await reload;

        expect(collection.calls).toBe(0);
    });

    // A folder switched while the first one is still waiting: the older
    // wait must abandon, or the list reloads twice and the stale one could
    // be the request that lands.
    it('should let a newer reload supersede one that is still waiting', async () => {
        const first = createCollection({ busyRounds: 4 });
        const second = createCollection();

        const stale = reloadCollection(() => first);
        const current = reloadCollection(() => second);

        await Promise.all([stale, current]);

        expect(first.calls).toBe(0);
        expect(second.calls).toBe(1);
    });

    it('should do nothing without a collection', async () => {
        await expect(reloadCollection(() => null)).resolves.toBeUndefined();
    });
});
