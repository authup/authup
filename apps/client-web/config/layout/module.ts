/*
 * Copyright (c) 2021-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { type Store } from '@authup/client-web-kit';
import type { IdentityPolicyData } from '@authup/access';
import { BuiltInPolicyType, PolicyData } from '@authup/access';
import type { NavigationItem } from '@vuecs/navigation';

import { LayoutSideDefaultNavigation } from './contants';
import type { NavigationItemMeta, NavigationTranslate } from './types';

export class Navigation {
    protected initialized : boolean;

    protected store: Store;

    protected translate?: NavigationTranslate;

    constructor(store: Store, translate?: NavigationTranslate) {
        this.initialized = false;
        this.store = store;
        this.translate = translate;
    }

    async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }

        this.initialized = true;

        try {
            await this.store.resolve();
        } catch {
            // do nothing :)
        }
    }

    /**
     * Resolve the sidebar navigation items, filtered against the current
     * session (login state + permissions). Used as the `:data` resolver of
     * the sidebar's `<VCNavItems>`; the permission checks run after an
     * `await`, so the component re-runs this via its `:watch` whenever the
     * session changes.
     */
    getSideItems(): Promise<NavigationItem[]> {
        return this.reduce(LayoutSideDefaultNavigation);
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
        if (item.meta) {
            const { loggedIn } = this.store;
            let identity: IdentityPolicyData | undefined;
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

            if (item.meta.requirePermissions) {
                const permissions : string[] = Array.isArray(item.meta.requirePermissions) ?
                    item.meta.requirePermissions :
                    [item.meta.requirePermissions];

                if (permissions.length > 0) {
                    try {
                        await this.store.permissionEvaluator.preEvaluateOneOf({
                            name: permissions,
                            input: new PolicyData({ [BuiltInPolicyType.IDENTITY]: identity }),
                        });
                    } catch {
                        return undefined;
                    }
                }
            }

            if (this.translate && item.meta.i18n) {
                item.name = await this.translate(item.meta.i18n);
            }
        }

        if (item.children) {
            item.children = await this.reduce(item.children);
        }

        return item;
    }
}
