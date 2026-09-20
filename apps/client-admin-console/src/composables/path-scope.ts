/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

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
 * How many folders the control offers and how far a scope reaches. It is
 * the path schema's own `pagination.maxLimit`, so asking for more is a 400.
 */
const PATH_SCOPE_LIMIT = 50;

/** The filter a folder scope contributes to a collection page's query. */
export type PathScopeFilters = {
    pathId?: string[]
};

export type PathScopeContext = {
    /** The realm whose folders are offered and resolved. */
    realmId?: MaybeRefOrGetter<string | undefined>
};

export type PathScope = {
    /** The selected folder's full path, or null while the page is unscoped. */
    path: ComputedRef<string | null>,
    /** The realm's folders, the options the control offers. */
    options: Ref<Path[]>,
    /** True while the folder named by `path` is being resolved. */
    pending: Ref<boolean>,
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
 */
export function buildPathScopeFilters(
    path: string | null,
    paths: Pick<Path, 'id'>[],
) : PathScopeFilters {
    if (!path) {
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

    const path = computed(() => readPathScopeQuery(route.query[PATH_SCOPE_QUERY_KEY]));
    const paths = ref<Path[]>([]);
    const options = ref<Path[]>([]);
    const pending = ref<boolean>(false);

    // Two rapid selections leave two lookups in flight, and the slower one
    // must not overwrite the newer folder's ids.
    let generation = 0;

    const loadOptions = async () => {
        const realmId = toValue(context.realmId);
        if (!realmId) {
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
            paths.value = [];
            return;
        }

        pending.value = true;

        let resolved : Path[];
        try {
            const response = await httpClient.path.getMany(defineQuery<Path>({
                filters: and(eq('realmId', realmId), buildPathScopeCondition(value)),
                sorts: ['path'],
                pagination: { limit: PATH_SCOPE_LIMIT },
            }));

            resolved = response.data;
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
        paths.value = resolved;
    };

    watch(() => toValue(context.realmId), () => {
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
        filters: computed(() => buildPathScopeFilters(path.value, paths.value)),
        select,
    };
}
