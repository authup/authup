/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import Vue, { CreateElement, PropType, VNode } from 'vue';
import { BuildInput } from 'rapiq';
import { OAuth2Provider, mergeDeep } from '@authelion/common';
import {
    ComponentListData,
    ComponentListHandlerMethodOptions,
    ComponentListMethods,
    ComponentListProperties,
    Pagination,
    PaginationMeta,
    buildListHeader,
    buildListItems,
    buildListNoMore,
    buildListPagination,
    buildListSearch,
} from '@vue-layout/utils';
import {
    useHTTPClient,
} from '../../utils';

type Properties = ComponentListProperties<OAuth2Provider> & {
    mapItems?: () => void,
    filterItems?: () => void
};

export const OAuth2ProviderList = Vue.extend<
ComponentListData<OAuth2Provider>,
ComponentListMethods<OAuth2Provider>,
any,
Properties
>({
    name: 'OAuth2ProviderList',
    components: { Pagination },
    props: {
        mapItems: Function,
        filterItems: Function,
        query: {
            type: Object as PropType<BuildInput<OAuth2Provider>>,
            default() {
                return {};
            },
        },
        withNoMore: {
            type: Boolean,
            default: true,
        },
        withHeader: {
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
        loadOnInit: {
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
    computed: {
        formattedItems() {
            let { items } = this;

            if (typeof this.filterItems === 'function') {
                items = items.filter(this.filterItems);
            }

            if (typeof this.mapItems === 'function') {
                items = items.map(this.mapItems);
            }

            return items;
        },
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
                const response = await useHTTPClient().oauth2Provider.getMany(mergeDeep({
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

        handleCreated(item: OAuth2Provider, options?: ComponentListHandlerMethodOptions<OAuth2Provider>) {
            options = options || {};

            const index = this.items.findIndex((el: OAuth2Provider) => el.id === item.id);
            if (index === -1) {
                if (options.unshift) {
                    this.items.unshift(item);
                } else {
                    this.items.push(item);
                }
            }
        },
        handleUpdated(item: OAuth2Provider) {
            const index = this.items.findIndex((el: OAuth2Provider) => el.id === item.id);
            if (index !== -1) {
                const keys : (keyof OAuth2Provider)[] = Object.keys(item) as (keyof OAuth2Provider)[];
                for (let i = 0; i < keys.length; i++) {
                    Vue.set(this.items[index], keys[i], item[keys[i]]);
                }
            }
        },
        handleDeleted(item: OAuth2Provider) {
            const index = this.items.findIndex((el: OAuth2Provider) => el.id === item.id);
            if (index !== -1) {
                this.items.splice(index, 1);
                this.meta.total--;
            }
        },
    },
    render(createElement: CreateElement): VNode {
        const header = buildListHeader(this, createElement, { titleText: 'Providers', iconClass: 'fa-solid fa-atom' });
        const search = buildListSearch(this, createElement);
        const items = buildListItems(this, createElement, { itemIconClass: 'fa-solid fa-atom' });
        const noMore = buildListNoMore(this, createElement, {
            text: 'No more oauth2-providers available...',
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

export default OAuth2ProviderList;
