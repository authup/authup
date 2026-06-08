/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { LayoutKey } from './contants';

/**
 * Identifies the catalog entry whose value replaces a nav item's
 * `name` at render time. Resolved in `Navigation.reduce()` via the
 * imperative translator supplied by the sidebar component.
 */
export type NavigationItemTranslation = {
    namespace: string,
    key: string,
};

export type NavigationItemMeta = {
    [LayoutKey.REQUIRED_LOGGED_IN]?: boolean,
    [LayoutKey.REQUIRED_LOGGED_OUT]?: boolean,
    [LayoutKey.REQUIRED_PERMISSIONS]?: string | string[],
    i18n?: NavigationItemTranslation,
};

/**
 * Resolves a nav item's `i18n` descriptor to its localized label.
 * Supplied by the sidebar component (which has the Vue injection
 * context the imperative translator needs).
 */
export type NavigationTranslate = (input: NavigationItemTranslation) => Promise<string>;
