/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    NavigationItem,
    NavigationProvider,
} from '@vuecs/navigation';
import {
    flattenNestedNavigationItems,
} from '@vuecs/navigation';
import type { RouteLocationNormalized } from 'vue-router';

import {
    LayoutKey,
    LayoutSideAdminNavigation,
    LayoutSideDefaultNavigation,
    LayoutTopNavigation,
} from './contants';
import { reduceNavigationElementsByRestriction } from './utils';

type NavigationProviderContext = {
    hasPermission: (name: string) => Promise<boolean>,
    isLoggedIn: () => boolean
};

export class Navigation implements NavigationProvider {
    protected sideElements : Record<string, NavigationItem[]>;

    protected topElements : NavigationItem[];

    protected context : NavigationProviderContext;

    constructor(context: NavigationProviderContext) {
        this.sideElements = {
            default: LayoutSideDefaultNavigation,
            admin: LayoutSideAdminNavigation,
        };

        this.topElements = LayoutTopNavigation;

        this.context = context;
    }

    async getItems(tier: number, items: NavigationItem[]): Promise<NavigationItem[] | undefined> {
        if (tier > 1) {
            return undefined;
        }

        if (tier === 0) {
            return reduceNavigationElementsByRestriction(this.topElements, {
                hasPermission: (name: string) => this.context.hasPermission(name),
                isLoggedIn: () => this.context.isLoggedIn(),
            });
        }

        let component : NavigationItem;
        if (items.length > 0) {
            [component] = items;
        } else {
            component = { id: 'default' };
        }

        return reduceNavigationElementsByRestriction(this.sideElements[component.id || 'default'] || [], {
            hasPermission: (name: string) => this.context.hasPermission(name),
            isLoggedIn: () => this.context.isLoggedIn(),
        });
    }

    async getItemsActiveByRoute(route: RouteLocationNormalized): Promise<NavigationItem[]> {
        const {
            [LayoutKey.NAVIGATION_ID]: topId,
            [LayoutKey.NAVIGATION_SIDE_ID]: sideId,
        } = route.meta;

        const url = route.fullPath;

        const keys = Object.keys(this.sideElements);
        for (let i = 0; i < keys.length; i++) {
            const items = flattenNestedNavigationItems(this.sideElements[keys[i]])
                .sort((a: NavigationItem, b: NavigationItem) => {
                    if (a.root && !b.root) {
                        return 1;
                    }

                    if (!a.root && b.root) {
                        return -1;
                    }

                    return (b.url?.length ?? 0) - (a.url?.length ?? 0);
                })
                .filter((item) => {
                    if (sideId) {
                        if (item.id === sideId) {
                            return true;
                        }
                    }

                    if (!item.url) return false;

                    if (item.rootLink) {
                        return url === item.url;
                    }

                    return url === item.url || url.startsWith(item.url);
                });

            if (items.length === 0) {
                continue;
            }

            const topIndex = this.topElements.findIndex(
                (el) => (topId && topId === el.id) || el.id === keys[i],
            );

            if (topIndex === -1) {
                continue;
            }

            return [
                this.topElements[topIndex],
                items[0],
            ];
        }

        const topIndex = this.topElements.findIndex(
            (el) => topId && topId === el.id,
        );
        if (topIndex !== -1) {
            return [
                this.topElements[topIndex],
            ];
        }

        return [];
    }
}
