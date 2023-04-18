/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    NavigationElement,
    NavigationProvider,
} from '@vue-layout/navigation';
import {
    findNavigationElementForTier,
    flattenNestedNavigationElements,
    reduceNavigationElementsByRestriction,
} from '@vue-layout/navigation';

import {
    LayoutSideAdminNavigation,
    LayoutSideDefaultNavigation,
    LayoutTopNavigation,
} from './contants';

type NavigationProviderContext = {
    hasPermission: (name: string) => boolean,
    isLoggedIn: () => boolean
};

export function buildNavigationProvider(context: NavigationProviderContext) : NavigationProvider {
    return {
        hasTier(tier: number): Promise<boolean> {
            return Promise.resolve([0, 1].indexOf(tier) !== -1);
        },
        async getElements(tier: number, elements: NavigationElement[]): Promise<NavigationElement[]> {
            if (!await this.hasTier(tier)) {
                return [];
            }

            let items : NavigationElement[] = [];

            switch (tier) {
                case 0:
                    items = LayoutTopNavigation;
                    break;
                case 1: {
                    const component: NavigationElement = findNavigationElementForTier(elements, 0) || { id: 'default' };

                    switch (component.id) {
                        case 'default':
                            items = LayoutSideDefaultNavigation;
                            break;
                        case 'admin':
                            items = LayoutSideAdminNavigation;
                            break;
                    }

                    break;
                }
            }

            return reduceNavigationElementsByRestriction(items, {
                hasPermission: (name: string) => context.hasPermission(name),
                isLoggedIn: () => context.isLoggedIn(),
            });
        },
        async getElementsActive(url: string): Promise<NavigationElement[]> {
            const sortFunc = (a: NavigationElement, b: NavigationElement) => (b.url?.length ?? 0) - (a.url?.length ?? 0);
            const filterFunc = (item: NavigationElement) => {
                if (!item.url) return false;

                if (item.rootLink) {
                    return url === item.url;
                }

                return url === item.url || url.startsWith(item.url);
            };

            // ------------------------

            let items = flattenNestedNavigationElements([...LayoutSideDefaultNavigation])
                .sort(sortFunc)
                .filter(filterFunc);

            if (items.length > 0) {
                return [
                    LayoutTopNavigation[0],
                    items[0],
                ];
            }

            items = flattenNestedNavigationElements([...LayoutSideAdminNavigation])
                .sort(sortFunc)
                .filter(filterFunc);

            if (items.length > 0) {
                return [
                    LayoutTopNavigation[1],
                    items[0],
                ];
            }

            return [];
        },
    };
}
