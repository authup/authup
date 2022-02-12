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
import { mergeDeep } from '../../../utils';
import { Pagination } from '../../Pagination';
import { ComponentListData } from '../../type';
import { hasNormalizedSlot, normalizeSlot } from '../../utils/normalize-slot';
import { SlotName } from '../../constants';

export type Properties = {
    [key: string]: any;

    query?: BuildInput<User>;

    withSearch?: boolean;

    loadOnInit?: boolean;
};

export const UserList = Vue.extend<ComponentListData<User>, any, any, Properties>({
    name: 'UserList',
    components: { Pagination },
    props: {
        query: {
            type: Object as PropType<BuildInput<User>>,
            default: undefined,
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
    watch: {
        q(val, oldVal) {
            if (val === oldVal) return;

            if (val.length === 1 && val.length > oldVal.length) {
                return;
            }

            this.meta.offset = 0;

            this.load();
        },
    },
    created() {
        if (this.loadOnInit) {
            this.load();
        }
    },
    methods: {
        async load() {
            if (this.busy) return;

            this.busy = true;

            try {
                const response = await this.$authApi.user.getMany(mergeDeep({
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
        goTo(options, resolve, reject) {
            if (options.offset === this.meta.offset) return;

            this.meta.offset = options.offset;

            this.load()
                .then(resolve)
                .catch(reject);
        },

        addArrayItem(item) {
            this.items.push(item);
        },
        editArrayItem(item) {
            const index = this.items.findIndex((el) => el.id === item.id);
            if (index !== -1) {
                const keys = Object.keys(item);
                for (let i = 0; i < keys.length; i++) {
                    Vue.set(this.items[index], keys[i], item[keys[i]]);
                }
            }
        },
        dropArrayItem(item) {
            const index = this.items.findIndex((el) => el.id === item.id);
            if (index !== -1) {
                this.items.splice(index, 1);
                this.meta.total--;
            }
        },
    },
    render(createElement: CreateElement): VNode {
        const vm = this;

        const h = createElement;

        const $scopedSlots = vm.$scopedSlots || {};
        const $slots = vm.$slots || {};
        const slotScope = {};

        let header = h();
        if (vm.withHeader) {
            const hasHeaderTitleSlot = hasNormalizedSlot(SlotName.HEADER_TITLE, $scopedSlots, $slots);
            const headerTitleAlt = h('h6', {
                staticClass: 'mb-0',
            }, [
                h('i', { staticClass: 'fa fa-users' }),
                ' Users',
            ]);

            const headerTitle = hasHeaderTitleSlot ?
                normalizeSlot(SlotName.HEADER_TITLE, $scopedSlots, $slots) :
                headerTitleAlt;

            // -------------------------------------------------------------

            const hasHeaderActionsSlot = hasNormalizedSlot(SlotName.HEADER_TITLE, $scopedSlots, $slots);
            const headerActionsAlt = h(
                'div',
                {
                    staticClass: 'd-flex flex-row',
                },
                [
                    h('div', [
                        h('button', {
                            domProps: {
                                type: 'button',
                                disabled: vm.busy,
                            },
                            staticClass: 'btn btn-xs btn-dark',
                            on: {
                                click($event: Event) {
                                    $event.preventDefault();

                                    // eslint-disable-next-line @typescript-eslint/ban-types,prefer-spread,prefer-rest-params
                                    return (vm.load as Function).apply(null, arguments);
                                },
                            },
                        }, [
                            h('i', { staticClass: 'fa fa-sync' }),
                            ' refresh',
                        ]),
                        h('a', {
                            props: {
                                to: '/admin/users/add',
                            },
                            domProps: {
                                type: 'button',
                                disabled: vm.busy,
                            },
                            staticClass: 'btn btn-xs btn-success ml-1',
                        }, [
                            h('i', { staticClass: 'fa fa-plus' }),
                            ' add',
                        ]),
                    ]),
                ],
            );

            const headerActions = hasHeaderActionsSlot ?
                normalizeSlot(SlotName.HEADER_ACTIONS, slotScope, $scopedSlots, $slots) :
                headerActionsAlt;

            // -------------------------------------------------------------

            const headerAlt = h(
                'div',
                {
                    staticClass: 'd-flex flex-row mb-2',
                },
                [
                    h('div', [headerTitle]),
                    h('div', { staticClass: 'ml-auto' }, [headerActions]),
                ],
            );

            const hasHeaderSlot = hasNormalizedSlot(SlotName.HEADER, $scopedSlots, $slots);
            header = h(
                'div',
                [hasHeaderSlot ?
                    normalizeSlot(SlotName.HEADER, slotScope, $scopedSlots, $slots) :
                    headerAlt],
            );
        }

        let search = h();
        if (vm.withSearch) {
            search = h('div', { staticClass: 'form-group' }, [
                h('div', { staticClass: 'input-group' }, [
                    h('input', {
                        directives: [{
                            name: 'model',
                            value: vm.q,
                        }],
                        staticClass: 'form-control',
                        attrs: {
                            type: 'text',
                            placeholder: '...',
                        },
                        domProps: {
                            value: vm.q,
                        },
                        on: {
                            input($event: any) {
                                if ($event.target.composing) {
                                    return;
                                }

                                vm.q = $event.target.value;
                            },
                        },
                    }),
                ]),
            ]);
        }

        // ----------------------------------------------------------------------

        const hasItemSlot = hasNormalizedSlot(SlotName.ITEM, $scopedSlots, $slots);
        const itemFn = (item: User) => h('div', {
            key: item.id,
        }, [
            h('div', {
                staticClass: 'align-items-center',
            }, [
                h('div', [h('i', { staticClass: 'fa fa-user' })]),
                h('div', [item.name]),
                h('div', { staticClass: 'ml-auto' }, [
                    hasNormalizedSlot(SlotName.ITEM_ACTIONS, $scopedSlots, $slots) ?
                        normalizeSlot(SlotName.ITEM_ACTIONS, { item }, $scopedSlots, $slots) :
                        '',
                ]),
            ]),
        ]);

        // ----------------------------------------------------------------------
        const itemsAlt = h('div', [
            vm.items.map((item: User) => (hasItemSlot ?
                normalizeSlot(SlotName.ITEM, {
                    item,
                    busy: vm.busy,
                }, $scopedSlots, $slots) :
                itemFn(item))),
        ]);

        const hasItemsSlot = hasNormalizedSlot(SlotName.ITEMS, $scopedSlots, $slots);
        const items = h(
            'div',
            [hasItemsSlot ?
                normalizeSlot(SlotName.ITEMS, {
                    items: vm.items,
                    busy: vm.busy,
                }, $scopedSlots, $slots) :
                itemsAlt,
            ],
        );

        // ----------------------------------------------------------------------

        let noMore = h();
        if (!vm.busy && vm.items.length === 0) {
            const hasNoMoreSlot = hasNormalizedSlot(SlotName.ITEMS_NO_MORE, $scopedSlots, $slots);
            if (hasNoMoreSlot) {
                noMore = normalizeSlot(SlotName.ITEMS_NO_MORE, {}, $scopedSlots, $slots);
            } else {
                noMore = h('div', { staticClass: 'alert alert-sm alert-info' }, [
                    'No (more) entries available.',
                ]);
            }
        }

        // ----------------------------------------------------------------------

        let pagination = h();
        if (vm.withPagination) {
            pagination = h(Pagination, {
                props: vm.meta,
                on: {
                    to($event: any) {
                        $event.preventDefault();
                        // eslint-disable-next-line @typescript-eslint/ban-types,prefer-spread,prefer-rest-params
                        return (vm.goTo as Function).apply(null, arguments);
                    },
                },
            });
        }

        return h('div', [
            header,
            search,
            items,
            noMore,
            pagination,
        ]);
    },
});

export default UserList;
