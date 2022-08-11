/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import Vue, { CreateElement, PropType, VNode } from 'vue';
import { Realm, mergeDeep } from '@authelion/common';
import { BuildInput } from 'rapiq';
import {
    ComponentListData,
    ComponentListProperties,
    Pagination,
    PaginationMeta,
    buildListHeader,
    buildListItems,
    buildListNoMore,
    buildListPagination,
    buildListSearch,
} from '@vue-layout/utils';
import { useHTTPClient } from '../../utils';

export const RealmList = Vue.extend<
ComponentListData<Realm>,
any,
any,
ComponentListProperties<BuildInput<Realm>>
>({
    name: 'RealmList',
    components: { Pagination },
    props: {
        loadOnInit: {
            type: Boolean,
            default: true,
        },
        query: {
            type: Object as PropType<BuildInput<Realm>>,
            default() {
                return {};
            },
        },
        withHeader: {
            type: Boolean,
            default: true,
        },
        withNoMore: {
            type: Boolean,
            default: true,
        },
        withPagination: {
            type: Boolean,
            default: true,
        },
        withSearch: {
            type: Boolean,
            default: true,
        },
    },
    data() {
        return {
            busy: false,
            items: [],
            q: '',
            meta: {
                limit: 10,
                offset: 0,
                total: 0,
            },
            itemBusy: false,
        };
    },
    watch: {
        q(val, oldVal) {
            if (val === oldVal) return;

            if (val.length === 1 && val.length > oldVal.length) {
                return;
            }

            this.meta.offset = 0;

            Promise.resolve()
                .then(this.load);
        },
    },
    created() {
        if (this.loadOnInit) {
            Promise.resolve()
                .then(this.load);
        }
    },
    methods: {
        async load(options?: PaginationMeta) {
            if (this.busy) return;

            if (options) {
                this.meta.offset = options.offset;
            }

            this.busy = true;

            try {
                const response = await useHTTPClient().realm.getMany(mergeDeep({
                    page: {
                        limit: this.meta.limit,
                        offset: this.meta.offset,
                    },
                    filter: {
                        name: this.q.length > 0 ? `~${this.q}` : this.q,
                    },
                }, this.query));

                this.items = response.data;
                const { total } = response.meta;

                this.meta.total = total;
            } catch (e) {
                // ...
            }

            this.busy = false;
        },

        handleCreated(item: Realm) {
            const index = this.items.findIndex((el: Realm) => el.id === item.id);
            if (index === -1) {
                this.items.push(item);
            }
        },
        handleUpdated(item: Realm) {
            const index = this.items.findIndex((el: Realm) => el.id === item.id);
            if (index !== -1) {
                const keys : (keyof Realm)[] = Object.keys(item) as (keyof Realm)[];
                for (let i = 0; i < keys.length; i++) {
                    Vue.set(this.items[index], keys[i], item[keys[i]]);
                }
            }
        },
        handleDeleted(item: Realm) {
            const index = this.items.findIndex((el: Realm) => el.id === item.id);
            if (index !== -1) {
                this.items.splice(index, 1);
                this.meta.total--;
            }
        },
    },
    render(createElement: CreateElement): VNode {
        const header = buildListHeader(this, createElement, {
            titleText: 'Realms',
            iconClass: 'fa fa-city',
        });
        const search = buildListSearch(this, createElement);
        const items = buildListItems(this, createElement, {
            itemIconClass: 'fa fa-city',
        });
        const noMore = buildListNoMore(this, createElement, {
            text: 'No more realms available...',
        });
        const pagination = buildListPagination(this, createElement);

        return createElement(
            'div',
            { staticClass: 'list' },
            [
                header,
                search,
                items,
                noMore,
                pagination,
            ],
        );
    },
});
