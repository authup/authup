/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import Vue, { CreateElement, VNode } from 'vue';
import { Permission } from '@typescript-auth/domains';
import { mergeDeep } from '../../../utils';
import { Pagination } from '../../core/Pagination';
import {
    ComponentListData, ComponentListMethods, ComponentListProperties, buildListHeader,
    buildListItems,
    buildListNoMore,
    buildListPagination,
    buildListSearch,
} from '../../helpers';
import { PaginationMeta } from '../../type';

export const PermissionList = Vue.extend<
ComponentListData<Permission>,
ComponentListMethods<Permission>,
any,
ComponentListProperties<Permission>
>({
    name: 'PermissionList',
    components: { Pagination },
    props: {
        query: {
            type: Object,
            default() {
                return {};
            },
        },
        loadOnInit: {
            type: Boolean,
            default: true,
        },
        withHeader: {
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
        async load() {
            if (this.busy) return;

            this.busy = true;

            try {
                const response = await this.$authApi.permission.getMany(mergeDeep({
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
        goTo(options: PaginationMeta, resolve: () => void, reject: (err?: Error) => void) {
            if (options.offset === this.meta.offset) return;

            this.meta.offset = options.offset;

            this.load()
                .then(resolve)
                .catch(reject);
        },

        handleCreated(item: Permission) {
            const index = this.items.findIndex((el: Permission) => el.id === item.id);
            if (index !== -1) {
                this.items.splice(index, 1);
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
        const header = buildListHeader(this, createElement, { title: 'Permissions', iconClass: 'fa-solid fa-key' });
        const search = buildListSearch(this, createElement);
        const items = buildListItems(this, createElement, { itemIconClass: 'fa-solid fa-key' });
        const noMore = buildListNoMore(this, createElement);
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
