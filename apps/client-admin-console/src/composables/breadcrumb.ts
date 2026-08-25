/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { useTranslation } from '@authup/client-web-kit';
import {
    TranslatorTranslationActionKey,
    TranslatorTranslationAppKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import type { BreadcrumbItem, NavigationItem } from '@vuecs/navigation';
import type { ComputedRef } from 'vue';
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import type { LayoutSection } from '../config/layout';
import { LayoutSections, buildSectionURLs } from '../config/layout';

const HOME_URL = '/';
const HOME_ICON = 'fa6-solid:house';
const ADD_ICON = 'fa6-solid:plus';

/**
 * A leaf crumb shown only on its own route. Only the entry whose `url` matches
 * the current path is appended, so a page may declare several and let the
 * router decide.
 */
export type BreadcrumbChild = {
    url: string,
    label: string,
    icon?: string
};

export type SectionBreadcrumbOptions = {
    /**
     * Append the section's `add` route as a leaf crumb while it is open.
     * Set on the ten sections that carry a `pages/<section>/index/add.vue`.
     */
    add?: boolean,
    /** Further leaf crumbs, each shown only on its own route. */
    children?: BreadcrumbChild[]
};

/**
 * A trailing slash is a distinct `route.path` but the same page.
 */
function normalizePath(value: string) : string {
    return value.length > 1 && value.endsWith('/') ?
        value.slice(0, -1) :
        value;
}

/**
 * The `Home > Section [> Leaf]` trail shared by every collection page.
 *
 * Home is always the root crumb: the sections are top level, so without it a
 * collection page would carry a single crumb, which is no trail at all. It is
 * the same route the sidebar's first entry points at.
 *
 * Route, icon and label of the section crumb come from the section descriptor
 * (`LayoutSections`), so a page cannot spell them differently than the sidebar.
 *
 * Detail pages do NOT use this: their trail names resolved entities
 * (`Clients > acme-app > Roles`), which has to be built from the loaded record
 * rather than from url segments so it cannot go stale. They call this for the
 * `Home > Section` head and extend it with {@see buildEntityBreadcrumb}.
 *
 * MUST be called synchronously during `setup()` (before any `await` in an
 * `async setup`): the label lookups and `useRoute()` resolve through `inject()`,
 * which no longer sees the component once the setup context is lost.
 */
export function useSectionBreadcrumb(
    section: `${LayoutSection}`,
    options: SectionBreadcrumbOptions = {},
) : ComputedRef<BreadcrumbItem[]> {
    const descriptor = LayoutSections[section];
    const route = useRoute();

    const homeLabel = useTranslation({
        namespace: TranslatorTranslationNamespace.APP,
        key: TranslatorTranslationAppKey.HOME,
    });
    const sectionLabel = useTranslation(descriptor.i18n);
    const addLabel = useTranslation({
        namespace: TranslatorTranslationNamespace.ACTION,
        key: TranslatorTranslationActionKey.ADD,
    });

    return computed<BreadcrumbItem[]>(() => {
        const items : BreadcrumbItem[] = [
            {
                label: homeLabel.value,
                to: HOME_URL,
                icon: HOME_ICON,
            },
            {
                label: sectionLabel.value,
                to: descriptor.url,
                icon: descriptor.icon,
            },
        ];

        const children : BreadcrumbChild[] = [
            ...(options.add ? [{
                url: buildSectionURLs(section).addUrl,
                label: addLabel.value,
                icon: ADD_ICON,
            }] : []),
            ...(options.children ?? []),
        ];

        const path = normalizePath(route.path);
        const child = children.find((entry) => normalizePath(entry.url) === path);
        if (child) {
            items.push({ label: child.label, icon: child.icon });
        }

        return items;
    });
}

export type EntityBreadcrumbContext = {
    /** The `Home > Section` head, from {@see useSectionBreadcrumb}. */
    base: BreadcrumbItem[],
    /** The record: its display label and its own route. */
    entity: {
        label: string,
        url: string
    },
    /** The current path (`route.path`), which selects the tab crumb. */
    path?: string,
    /**
     * The detail page's tab rail. Only the tab matching `path` is appended, and
     * only when it is a real sibling tab: the back arrow (no label) and the tab
     * that IS the record route are skipped, since neither adds a level.
     */
    tabs?: NavigationItem[]
};

/**
 * Extend a section trail into the `Home > Section > <record> [> Tab]` trail a
 * detail page shows. A plain function, not a composable: the record is only
 * known after its fetch has been awaited, at which point `inject()` no longer
 * resolves, so the page passes the already-resolved values in.
 *
 * `VCBreadcrumb` marks the last crumb as the current page and keeps it a real
 * link (W3C APG), so every crumb may carry its route.
 */
export function buildEntityBreadcrumb(ctx: EntityBreadcrumbContext) : BreadcrumbItem[] {
    const items : BreadcrumbItem[] = [
        ...ctx.base,
        {
            label: ctx.entity.label,
            to: ctx.entity.url,
        },
    ];

    if (!ctx.path || !ctx.tabs) {
        return items;
    }

    const path = normalizePath(ctx.path);
    const entityURL = normalizePath(ctx.entity.url);

    const tab = ctx.tabs.find((entry) => !!entry.name &&
        !!entry.url &&
        normalizePath(entry.url) !== entityURL &&
        normalizePath(entry.url) === path);

    if (tab) {
        items.push({ label: tab.name, icon: tab.icon });
    }

    return items;
}
