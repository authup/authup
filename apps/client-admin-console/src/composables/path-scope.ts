/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ListLoadFn } from '@authup/client-web-kit';
import { buildPathScopeCondition, injectHTTPClient } from '@authup/client-web-kit';
import type { Path } from '@authup/core-kit';
import type { ICondition } from '@rapiq/core';
import { and, defineQuery, eq } from '@rapiq/core';
import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue';
import {
    computed,
    ref,
    toValue,
    watch,
} from 'vue';
import { useRoute, useRouter } from 'vue-router';

/** The query parameter a folder-scoped collection page carries its folder in. */
export const PATH_SCOPE_QUERY_KEY = 'path';

/**
 * How many folders one request reads. It is the path schema's own
 * `pagination.maxLimit`, so asking for more is a 400.
 */
export const PATH_SCOPE_LIMIT = 50;

/**
 * ponytail: how many pages a subtree lookup walks before it gives up, so the
 * ceiling is 10 pages of 50 = 500 folders. A realm past that scopes nothing
 * and says so: the list is shown unnarrowed rather than silently short, which
 * is the one thing a folder filter must never be.
 */
export const PATH_SCOPE_PAGE_LIMIT = 10;

/**
 * How many ids a scope may carry, the SECOND ceiling and in practice the one
 * that fires: the ids travel as one `IN` in a query string, which measures
 * about 41 characters each, so 300 is roughly 12 KB and 400 already outgrows
 * node's default 16 KB header budget. A list that cannot travel is truncated
 * like one that was never assembled, since a failed list request is no better
 * an answer than a short one.
 */
export const PATH_SCOPE_ID_LIMIT = 300;

/** The filter a folder scope contributes to a collection page's query. */
export type PathScopeFilters = {
    pathId?: string[]
};

/** One page of a folder lookup, as the collection response carries it. */
export type PathScopePage = {
    data: Path[],
    meta?: { total?: number }
};

/**
 * Walk a folder lookup to completion, bounded by {@see PATH_SCOPE_PAGE_LIMIT}
 * pages and {@see PATH_SCOPE_ID_LIMIT} folders.
 *
 * One page cannot answer a subtree: `PATH_SCOPE_LIMIT` is the server's own
 * `maxLimit`, so a realm holding more folders than that would feed a short id
 * list into the collection's `IN` and drop rows out of the list with no error
 * and a plausible-looking total. Past either bound the caller is told rather
 * than narrowed, so the wrong answer is never served.
 */
export async function collectPathPages(
    load: (offset: number) => Promise<PathScopePage>,
) : Promise<{ data: Path[], truncated: boolean }> {
    const data : Path[] = [];

    for (let page = 0; page < PATH_SCOPE_PAGE_LIMIT; page += 1) {
        const response = await load(page * PATH_SCOPE_LIMIT);
        data.push(...response.data);

        const total = response.meta?.total ?? data.length;
        if (response.data.length === 0 || data.length >= total) {
            return {
                data,
                truncated: false,
            };
        }

        // more folders exist AND what is held already fills the id budget, so
        // the remaining pages would only build a filter that cannot be sent
        if (data.length >= PATH_SCOPE_ID_LIMIT) {
            return {
                data,
                truncated: true,
            };
        }
    }

    return {
        data,
        truncated: true,
    };
}

/** How many times a refused reload is re-offered before it gives up. */
export const RELOAD_ATTEMPTS = 3;

/** How long to wait before re-offering one. */
const RELOAD_RETRY_INTERVAL = 150;

/** The part of a collection's exposed surface a reload needs. */
export type ReloadableCollection = {
    load: ListLoadFn,
    data: readonly unknown[]
};

/**
 * Reload a collection whose BASE query changed.
 *
 * The collection reads that query on every load but does not watch the
 * prop, so a page that narrows its own query has to ask for the reload.
 * The ask can be refused: `load` is a silent no-op while another load is in
 * flight, and the collection exposes no busy flag to wait on. What it does
 * expose is `data`, which a completed load reassigns, so a refusal is
 * re-offered until the rows change.
 *
 * The attempts are capped because a load that RAN and failed also leaves
 * the rows untouched and cannot be told apart from a refusal here. A
 * refused offer costs nothing, and an idle collection costs one request.
 */
export async function reloadCollection(
    get: () => ReloadableCollection | null,
) : Promise<void> {
    for (let attempt = 0; attempt < RELOAD_ATTEMPTS; attempt += 1) {
        const collection = get();
        if (!collection) {
            return;
        }

        const rows = collection.data;

        // Back to the first page: the narrowed set is shorter, so the
        // retained offset would ask for rows past its end.
        await collection.load({ pagination: { offset: 0 } });

        if (get()?.data !== rows) {
            return;
        }

        await new Promise((resolve) => {
            setTimeout(resolve, RELOAD_RETRY_INTERVAL);
        });
    }
}

export type PathScopeContext = {
    /** The realm whose folders are offered and resolved. */
    realmId?: MaybeRefOrGetter<string | undefined>,
    /**
     * Whether the actor may read folders at all. A page gates this on
     * `PATH_READ`: without it there is no folder to scope by, so the scope
     * reads as absent and no folder request is made.
     */
    enabled?: MaybeRefOrGetter<boolean>
};

export type PathScope = {
    /** The selected folder's full path, or null while the page is unscoped. */
    path: ComputedRef<string | null>,
    /** The realm's folders, the options the control offers. */
    options: Ref<Path[]>,
    /** True while the folder named by `path` is being resolved. */
    pending: Ref<boolean>,
    /**
     * True when the subtree outgrew {@see PATH_SCOPE_PAGE_LIMIT} pages. The
     * scope then narrows NOTHING, so a page that renders the list has to say
     * why it is showing every row.
     */
    truncated: Ref<boolean>,
    /** The `pathId` filter the page spreads into its own query. */
    filters: ComputedRef<PathScopeFilters>,
    /** Write the folder into the route, or clear it with `null`. */
    select: (path: string | null) => void
};

/**
 * The `?path=` value. An absent, empty or repeated parameter reads as no
 * scope: a folder is one value, and a page with two of them has no folder.
 */
export function readPathScopeQuery(value: unknown) : string | null {
    if (typeof value !== 'string' || value.length === 0) {
        return null;
    }

    return value;
}

/**
 * Map a resolved folder scope onto the filter a page adds to its query.
 *
 * Without a scope the key is absent, so the page's own filters are
 * untouched. With one it is the resolved ids, and a scope that resolved to
 * nothing yields the EMPTY list rather than no key at all: rapiq encodes
 * that as `in(pathId)`, a constant false, so an unknown folder lists
 * nothing where a dropped key would list every row.
 *
 * A TRUNCATED subtree is the one case that contributes nothing: the ids are
 * known to be incomplete, so filtering by them would drop rows the visitor
 * asked to see. The unnarrowed list plus the page's notice is the honest
 * answer; a silently short one is not.
 */
export function buildPathScopeFilters(
    path: string | null,
    paths: Pick<Path, 'id'>[],
    truncated = false,
) : PathScopeFilters {
    if (!path || truncated) {
        return {};
    }

    return { pathId: paths.map((entry) => entry.id) };
}

/**
 * The filter the folder collection itself composes: the realm's folders,
 * narrowed to one subtree when the route names a folder.
 *
 * It is the other end of the crumbs {@see buildPathAncestors} builds, which
 * link an ancestor segment to `/paths?path=<prefix>`. The narrowing is a
 * condition over the derived `path` column, so it is one indexed lookup on
 * the folders table rather than a walk of the parent chain.
 *
 * The realm leg is always present, `null` included: a folder always belongs
 * to a realm, so binding `null` matches none of them, where dropping the
 * leg would list every realm's folders.
 */
export function buildPathCollectionFilters(
    path: string | null,
    realmId: string | null,
) : ICondition {
    const realm = eq('realmId', realmId);

    if (!path) {
        return realm;
    }

    return and(realm, buildPathScopeCondition(path));
}

/**
 * The folder a collection page is scoped to, read from and written to the
 * route so the selection survives a reload and can be shared as a link.
 *
 * A scope is the folder AND everything below it, so it resolves through a
 * prefix lookup into the id list the page filters by. The lookup is one
 * request per folder change; the page reloads its collection when
 * {@see PathScope.filters} changes, since the collection reads its base
 * query per load but does not watch the prop.
 */
export function usePathScope(context: PathScopeContext = {}) : PathScope {
    const route = useRoute();
    const router = useRouter();
    const httpClient = injectHTTPClient();

    const enabled = () => toValue(context.enabled ?? true);

    // An actor that may not read folders has no scope: the parameter is
    // ignored rather than resolved, so the page lists everything it would
    // have listed anyway and asks for no folder.
    const path = computed(() => (enabled() ?
        readPathScopeQuery(route.query[PATH_SCOPE_QUERY_KEY]) :
        null));
    const paths = ref<Path[]>([]);
    const options = ref<Path[]>([]);
    const pending = ref<boolean>(false);
    const truncated = ref<boolean>(false);

    // Two rapid selections leave two lookups in flight, and the slower one
    // must not overwrite the newer folder's ids.
    let generation = 0;

    const loadOptions = async () => {
        const realmId = toValue(context.realmId);
        if (!realmId || !enabled()) {
            options.value = [];
            return;
        }

        try {
            const response = await httpClient.path.getMany(defineQuery<Path>({
                filters: { realmId },
                sorts: ['path'],
                pagination: { limit: PATH_SCOPE_LIMIT },
            }));

            options.value = response.data;
        } catch {
            // The control degrades to the unscoped entry. A folder list
            // that could not be read must not take the page down with it.
            options.value = [];
        }
    };

    const resolve = async () => {
        const current = ++generation;
        const { value } = path;
        const realmId = toValue(context.realmId);

        if (!value || !realmId) {
            pending.value = false;
            truncated.value = false;
            paths.value = [];
            return;
        }

        pending.value = true;

        let resolved : Path[];
        let overflowed = false;
        try {
            const collected = await collectPathPages((offset) => httpClient.path.getMany(defineQuery<Path>({
                filters: and(eq('realmId', realmId), buildPathScopeCondition(value)),
                sorts: ['path'],
                pagination: {
                    limit: PATH_SCOPE_LIMIT,
                    offset,
                },
            })));

            resolved = collected.data;
            overflowed = collected.truncated;
        } catch {
            // A lookup that failed reaches no folder, which lists nothing.
            // Falling back to the unscoped list would show rows the visitor
            // asked to be shielded from.
            resolved = [];
        }

        if (current !== generation) {
            return;
        }

        // The pending flag clears BEFORE the ids land, so the page's reload
        // watcher sees a settled scope whatever order it runs in. The ids
        // are always a fresh array, so that watcher fires on every outcome:
        // a lookup that answered nothing still has to let the list load.
        pending.value = false;
        truncated.value = overflowed;
        paths.value = resolved;
    };

    // `enabled` is a permission check, which starts fail-closed and settles
    // asynchronously, so both passes rerun when it flips.
    watch([() => toValue(context.realmId), enabled], () => {
        loadOptions();
    }, { immediate: true });

    watch([path, () => toValue(context.realmId)], () => {
        resolve();
    }, { immediate: true });

    const select = (value: string | null) => {
        const query = { ...route.query };

        if (value) {
            query[PATH_SCOPE_QUERY_KEY] = value;
        } else {
            delete query[PATH_SCOPE_QUERY_KEY];
        }

        router.replace({ query });
    };

    return {
        path,
        options,
        pending,
        truncated,
        filters: computed(() => buildPathScopeFilters(path.value, paths.value, truncated.value)),
        select,
    };
}
