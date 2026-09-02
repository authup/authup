/*
 * Copyright (c) 2021-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { type Store, StoreAuthStatus } from '@authup/client-web-kit';
import type { IdentityPolicyData } from '@authup/access';
import { BuiltInPolicyType, definePolicyData } from '@authup/access';
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

    /**
     * Filter one item against the session and localize its label.
     *
     * The input is an element of the module-level `LayoutSideDefaultNavigation`
     * constant, so nothing here may write back onto it: a mutation would prune
     * the source array permanently, and a later resolve with wider permissions
     * (a login, a realm switch) could not restore what an earlier one removed.
     * The localized name and the filtered children therefore go onto a copy.
     */
    protected async reduceItem(item: NavigationItem<NavigationItemMeta>) : Promise<NavigationItem | undefined> {
        let { name } = item;

        if (item.meta) {
            const authenticated = this.store.status === StoreAuthStatus.AUTHENTICATED;
            let identity: IdentityPolicyData | undefined;
            if (this.store.userId) {
                identity = {
                    type: 'user',
                    id: this.store.userId,
                };
            }

            if (
                !authenticated &&
                    typeof item.meta.requireLoggedIn !== 'undefined' &&
                    item.meta.requireLoggedIn
            ) {
                return undefined;
            }

            if (
                authenticated &&
                    typeof item.meta.requireLoggedOut !== 'undefined' &&
                    item.meta.requireLoggedOut
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
                            data: definePolicyData({ [BuiltInPolicyType.IDENTITY]: identity }),
                        });
                    } catch {
                        return undefined;
                    }
                }
            }

            if (this.translate && item.meta.i18n) {
                name = await this.translate(item.meta.i18n);
            }
        }

        const output : NavigationItem<NavigationItemMeta> = { ...item, name };

        if (item.children) {
            const children = await this.reduce(item.children);

            // A group whose children were all filtered away renders as a leaf,
            // so without a url of its own it would sit there as a dead entry.
            if (children.length === 0 && !item.url) {
                return undefined;
            }

            output.children = children;
        }

        return output;
    }
}
