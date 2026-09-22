/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityListQueryInput, ListLoadFn } from '@authup/client-web-kit';
import { buildPathScopeCondition, injectHTTPClient } from '@authup/client-web-kit';
import type { Path } from '@authup/core-kit';
import type { ObjectLiteral } from '@authup/kit';
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

/**
 * How many folders the tree pane renders before it reports itself
 * incomplete. It is the page walk's own ceiling, so the pane is bounded by
 * the requests it may make and by nothing else: the id budget above is the
 * `IN` filter's, and the pane builds no filter.
 */
export const PATH_TREE_LIMIT = PATH_SCOPE_PAGE_LIMIT * PATH_SCOPE_LIMIT;

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
 * pages and by `limit` folders ({@see PATH_SCOPE_ID_LIMIT} for a scope that
 * has to travel as an `IN`, {@see PATH_TREE_LIMIT} for the pane, which
 * builds no filter and is bounded by the page walk alone).
 *
 * One page cannot answer a subtree: `PATH_SCOPE_LIMIT` is the server's own
 * `maxLimit`, so a realm holding more folders than that would feed a short id
 * list into the collection's `IN` and drop rows out of the list with no error
 * and a plausible-looking total. Past either bound the caller is told rather
 * than narrowed, so the wrong answer is never served.
 */
export async function collectPathPages(
    load: (offset: number) => Promise<PathScopePage>,
    limit: number = PATH_SCOPE_ID_LIMIT,
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

        // more folders exist AND what is held already fills the caller's
        // budget, so the remaining pages would only build a filter that
        // cannot be sent
        if (data.length >= limit) {
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

/** How long to wait before looking at a busy collection again. */
const RELOAD_POLL_INTERVAL = 50;

/** The part of a collection's exposed surface a reload needs. */
export type ReloadableCollection<T extends ObjectLiteral = ObjectLiteral> = {
    load: ListLoadFn<EntityListQueryInput<T>>,
    busy?: boolean
};

/**
 * Which reload is the current one. A newer scope supersedes an older one
 * that is still waiting, so a stale folder can never be the query that
 * lands.
 */
let reloadGeneration = 0;

/**
 * Reload a collection whose BASE query changed.
 *
 * The collection reads that query on every load but does not watch the
 * prop, so a page that narrows its own query has to ask for the reload.
 * The ask is REFUSED while another load is in flight (`load` is a silent
 * no-op then), which is the ordinary case here: the scope settles while the
 * list is still fetching the rows it was mounted with. So the reload waits
 * for the collection to go idle and only then asks, rather than asking and
 * guessing afterwards whether it was taken.
 *
 * The wait is NOT capped, because a deadline is a way to answer a folder
 * with every row in the realm: whatever the ceiling, a first load slower
 * than it leaves the narrowed query unsent while the address bar and the
 * tree both say a folder is selected. It terminates on the two states that
 * exist instead — `load` clears `busy` in a `finally`, so a collection
 * that is busy becomes idle, and an unmounted page hands back no collection
 * at all.
 */
export async function reloadCollection<T extends ObjectLiteral>(
    get: () => ReloadableCollection<T> | null,
) : Promise<void> {
    reloadGeneration += 1;
    const generation = reloadGeneration;

    for (;;) {
        if (generation !== reloadGeneration) {
            return;
        }

        const collection = get();
        if (!collection) {
            return;
        }

        if (!collection.busy) {
            // Back to the first page: the narrowed set is shorter, so the
            // retained offset would ask for rows past its end.
            await collection.load({ pagination: { offset: 0 } });
            return;
        }

        await new Promise((resolve) => {
            setTimeout(resolve, RELOAD_POLL_INTERVAL);
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
    enabled?: MaybeRefOrGetter<boolean>,
    /**
     * Whether `enabled` is the settled verdict rather than the permission
     * check's fail-closed default. While it is not, a folder in the route
     * reads as pending, so a deep link holds its first load instead of
     * listing every row for one request (#3632).
     */
    settled?: MaybeRefOrGetter<boolean>
};

export type PathScope = {
    /** The selected folder's full path, or null while the page is unscoped. */
    path: ComputedRef<string | null>,
    /** The realm's folders, the tree the control renders. */
    options: Ref<Path[]>,
    /**
     * True when the realm holds more folders than {@see PATH_TREE_LIMIT}.
     * The pane then shows a prefix of the tree, so the page has to say that
     * a folder may be missing rather than let it read as absent.
     */
    optionsTruncated: Ref<boolean>,
    /**
     * True while the folder named by the route is being resolved, or while
     * the permission check that decides whether it is resolved at all has
     * not settled yet.
     */
    pending: ComputedRef<boolean>,
    /**
     * True when the folder lookup failed. The scope then lists nothing
     * (fail-closed), so the page has to say why rather than let it read as
     * an empty folder, and can offer {@see PathScope.retry}.
     */
    failed: Ref<boolean>,
    /**
     * True when the lookup answered but the named folder does not exist
     * (renamed, moved or deleted since the link was made). It lists nothing
     * as well, for the same reason.
     */
    missing: Ref<boolean>,
    /** Repeat the folder lookup, the answer to a failed one. */
    retry: () => void,
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
    const optionsTruncated = ref<boolean>(false);
    const settled = () => toValue(context.settled ?? true);
    const resolving = ref<boolean>(false);
    const failed = ref<boolean>(false);
    const missing = ref<boolean>(false);
    const truncated = ref<boolean>(false);

    // A folder in the route is pending until the permission check has
    // settled too: `path` reads null while `enabled` is still at its
    // fail-closed default, which is indistinguishable from "no folder" and
    // would let the first load list every row. A check that settles
    // negative clears it, and the page then lists what it always would.
    const pending = computed(() => resolving.value || (
        !settled() &&
        readPathScopeQuery(route.query[PATH_SCOPE_QUERY_KEY]) !== null
    ));

    // Two rapid selections leave two lookups in flight, and the slower one
    // must not overwrite the newer folder's ids. The pane gets the same
    // guard, so a realm change cannot leave the older realm's tree behind.
    let generation = 0;
    let optionsGeneration = 0;

    const loadOptions = async () => {
        const current = ++optionsGeneration;
        const realmId = toValue(context.realmId);
        if (!realmId || !enabled()) {
            options.value = [];
            optionsTruncated.value = false;
            return;
        }

        try {
            // The whole realm, not one page: a tree is read by walking it
            // down, so a folder missing from the pane is a folder the
            // visitor cannot reach at all, where a dropdown merely showed
            // fewer entries.
            const collected = await collectPathPages(
                (offset) => httpClient.path.getMany(defineQuery<Path>({
                    filters: { realmId },
                    sorts: ['path'],
                    pagination: {
                        limit: PATH_SCOPE_LIMIT,
                        offset,
                    },
                })),
                PATH_TREE_LIMIT,
            );

            if (current !== optionsGeneration) {
                return;
            }

            options.value = collected.data;
            optionsTruncated.value = collected.truncated;
        } catch {
            if (current !== optionsGeneration) {
                return;
            }

            // The control degrades to the unscoped entry. A folder list
            // that could not be read must not take the page down with it.
            options.value = [];
            optionsTruncated.value = false;
        }
    };

    const resolve = async () => {
        const current = ++generation;
        const { value } = path;
        const realmId = toValue(context.realmId);

        if (!value) {
            // no folder in the route: the page is unscoped, which is a
            // settled answer rather than a pending one
            resolving.value = false;
            failed.value = false;
            missing.value = false;
            truncated.value = false;
            paths.value = [];
            return;
        }

        if (!realmId) {
            // Defensive rather than ordinary: the routing guard awaits
            // `store.resolve()` before a page mounts and the session commit
            // writes the managed realm synchronously, so a mounted page
            // knows its realm. A realm missing anyway leaves the scope
            // UNRESOLVED rather than empty, since the empty id list is a
            // constant-false filter and the load taken in that window would
            // list nothing. The watcher re-runs when the realm arrives.
            resolving.value = true;
            return;
        }

        resolving.value = true;

        let resolved : Path[];
        let overflowed = false;
        let failure = false;
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
            failure = true;
        }

        if (current !== generation) {
            return;
        }

        // The pending flag clears BEFORE the ids land, so the page's reload
        // watcher sees a settled scope whatever order it runs in. The ids
        // are always a fresh array, so that watcher fires on every outcome:
        // a lookup that answered nothing still has to let the list load.
        resolving.value = false;
        failed.value = failure;
        // A subtree lookup always carries the folder itself, so an answer
        // without it names a folder that is gone.
        missing.value = !failure && resolved.every((entry) => !(entry.path === value));
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
        optionsTruncated,
        pending,
        failed,
        missing,
        retry: () => {
            resolve();
        },
        truncated,
        // A scope still being resolved contributes NOTHING, where a scope
        // that resolved to nothing contributes the empty id list. The two
        // look alike and are opposites: the empty list is a constant-false
        // filter, so publishing it before the lookup has answered would
        // make every load taken in that window list nothing, and the page
        // holds its own load while `pending` is set anyway.
        filters: computed(() => (pending.value ?
            {} :
            buildPathScopeFilters(path.value, paths.value, truncated.value))),
        select,
    };
}
