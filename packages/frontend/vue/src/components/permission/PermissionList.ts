/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import Vue, { CreateElement, PropType, VNode } from 'vue';
import { Permission, mergeDeep } from '@authelion/common';
import { BuildInput } from '@trapi/query';
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
import { useHTTPClient } from '../../utils';

export const PermissionList = Vue.extend<
ComponentListData<Permission>,
ComponentListMethods<Permission>,
any,
ComponentListProperties<Permission>
>({
    name: 'PermissionList',
    components: { Pagination },
    props: {
        loadOnInit: {
            type: Boolean,
            default: true,
        },
        query: {
            type: Object as PropType<BuildInput<Permission>>,
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
                const response = await useHTTPClient().permission.getMany(mergeDeep({
                    page: {
                        limit: this.meta.limit,
                        offset: this.meta.offset,
                    },
                    filter: {
                        id: this.q.length > 0 ? `~${this.q}` : this.q,
                    },
                    sort: {
                        id: 'ASC',
                    },
                }, this.query));

                this.items = response.data;
                const { total } = response.meta;
                this.meta.total = total;
            } catch (e) {
                if (e instanceof Error) {
                    this.$emit('failed', e);
                }
            }

            this.busy = false;
        },

        handleCreated(item: Permission, options?: ComponentListHandlerMethodOptions<Permission>) {
            options = options || {};

            const index = this.items.findIndex((el: Permission) => el.id === item.id);
            if (index === -1) {
                if (options.unshift) {
                    this.items.unshift(item);
                } else {
                    this.items.push(item);
                }
            }
        },
        handleUpdated(item: Permission) {
            const index = this.items.findIndex((el: Permission) => el.id === item.id);
            if (index !== -1) {
                const keys : (keyof Permission)[] = Object.keys(item) as (keyof Permission)[];
                for (let i = 0; i < keys.length; i++) {
                    Vue.set(this.items[index], keys[i], item[keys[i]]);
                }
            }
        },
        handleDeleted(item: Permission) {
            const index = this.items.findIndex((el: Permission) => el.id === item.id);
            if (index !== -1) {
                this.items.splice(index, 1);
                this.meta.total--;
            }
        },
    },
    render(createElement: CreateElement): VNode {
        const header = buildListHeader(this, createElement, { titleText: 'Permissions', iconClass: 'fa-solid fa-key' });
        const search = buildListSearch(this, createElement);
        const items = buildListItems(this, createElement, { itemIconClass: 'fa-solid fa-key', itemTextPropName: 'id' });
        const noMore = buildListNoMore(this, createElement, {
            text: 'No more permissions available...',
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
