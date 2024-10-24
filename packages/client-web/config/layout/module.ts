/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { type Store } from '@authup/client-web-kit';
import type { PolicyIdentity } from '@authup/kit';
import type {
    NavigationItem,
    NavigationItemNormalized,
} from '@vuecs/navigation';

import {
    LayoutSideAdminNavigation,
    LayoutSideDefaultNavigation,
    LayoutTopNavigation,
} from './contants';
import type { NavigationItemMeta } from './types';

export class Navigation {
    protected initialized : boolean;

    protected store: Store;

    constructor(store: Store) {
        this.initialized = false;
        this.store = store;
    }

    async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }

        this.initialized = true;

        try {
            await this.store.resolve();
        } catch (e) {
            // do nothing :)
        }
    }

    async getItems(level: number, parent?: NavigationItemNormalized): Promise<NavigationItem[]> {
        if (level === 0) {
            return this.reduce(LayoutTopNavigation);
        }

        if (parent) {
            if (level === 1) {
                if (parent.name === 'Admin') {
                    return this.reduce(LayoutSideAdminNavigation);
                }

                return this.reduce(LayoutSideDefaultNavigation);
            }
        }

        return [];
    }

    protected async reduce(items: NavigationItem[]) : Promise<NavigationItem[]> {
        await this.initialize();

        const promises = items.map(
            (item) => this.reduceItem(item),
        );

        const output = await Promise.all(promises);

        return output.filter((item) => !!item);
    }

    protected async reduceItem(item: NavigationItem<NavigationItemMeta>) : Promise<NavigationItem | undefined> {
        if (!item.meta) {
            return item;
        }

        const { loggedIn } = this.store;
        let identity: PolicyIdentity | undefined;
        if (this.store.userId) {
            identity = {
                type: 'user',
                id: this.store.userId,
            };
        }

        if (
            typeof item.meta.requireLoggedIn !== 'undefined' &&
                item.meta.requireLoggedIn &&
                !loggedIn
        ) {
            return undefined;
        }

        if (
            typeof item.meta.requireLoggedOut !== 'undefined' &&
                item.meta.requireLoggedOut &&
                loggedIn
        ) {
            return undefined;
        }

        let canPass = true;

        if (item.meta.requirePermissions) {
            let permissions : string[] = [];
            if (Array.isArray(item.meta.requirePermissions)) {
                permissions = item.meta.requirePermissions;
            } else {
                permissions = [item.meta.requirePermissions];
            }

            if (permissions.length > 0) {
                try {
                    await this.store.permissionChecker.preCheckOneOf({
                        name: permissions,
                        data: {
                            identity,
                        },
                    });
                } catch (e) {
                    canPass = false;
                }
            }
        }

        if (canPass) {
            if (item.children) {
                item.children = await this.reduce(item.children);
            }

            return item;
        }

        return undefined;
    }
}
