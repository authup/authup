/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import Vue, {
    CreateElement, PropType, VNode,
} from 'vue';
import { BuildInput } from '@trapi/query';
import { User } from '@typescript-auth/domains';
import { mergeDeep, useHTTPClient } from '../../../utils';
import { Pagination } from '../../helpers/list/components/Pagination';
import { PaginationMeta } from '../../type';
import {
    ComponentListData,
    ComponentListMethods,
    ComponentListProperties,
    buildListHeader,
    buildListItems,
    buildListNoMore,
    buildListPagination, buildListSearch,
} from '../../helpers';

export const UserList = Vue.extend<
ComponentListData<User>,
ComponentListMethods<User>,
any,
ComponentListProperties<User>
>({
    name: 'UserList',
    components: { Pagination },
    props: {
        loadOnInit: {
            type: Boolean,
            default: true,
        },
        query: {
            type: Object as PropType<BuildInput<User>>,
            default: undefined,
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
        async load() {
            if (this.busy) return;

            this.busy = true;

            try {
                const response = await useHTTPClient().user.getMany(mergeDeep({
                    include: {
                        realm: true,
                    },
                    page: {
                        limit: this.meta.limit,
                        offset: this.meta.offset,
                    },
                    filter: {
                        name: this.q.length > 0 ? `~${this.q}` : this.q,
                    },
                }, this.query || {}));

                this.items = response.data;
                const { total } = response.meta;

                this.meta.total = total;
            } catch (e) {
                // ...
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

        handleCreated(item: User, unshift?: boolean) {
            const index = this.items.findIndex((el: User) => el.id === item.id);
            if (index === -1) {
                if (unshift) {
                    this.items.unshift(item);
                } else {
                    this.items.push(item);
                }
            }
        },
        handleUpdated(item: User) {
            const index = this.items.findIndex((el: User) => el.id === item.id);
            if (index !== -1) {
                const keys : (keyof User)[] = Object.keys(item) as (keyof User)[];
                for (let i = 0; i < keys.length; i++) {
                    Vue.set(this.items[index], keys[i], item[keys[i]]);
                }
            }
        },
        handleDeleted(item: User) {
            const index = this.items.findIndex((el: User) => el.id === item.id);
            if (index !== -1) {
                this.items.splice(index, 1);
                this.meta.total--;
            }
        },
    },
    render(createElement: CreateElement): VNode {
        const header = buildListHeader(this, createElement, { title: 'Users', iconClass: 'fa fa-users' });
        const search = buildListSearch(this, createElement);
        const items = buildListItems(this, createElement, { itemIconClass: 'fa fa-user' });
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

export default UserList;
