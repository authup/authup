/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import Vue, { CreateElement, PropType, VNode } from 'vue';
import { UserRole } from '@typescript-auth/domains';
import { ComponentListItemData } from '../../helpers';

export type Properties = {
    items?: UserRole[],
    roleId?: string,
    userId?: string
};

export const UserRoleListItemActions = Vue.extend<ComponentListItemData<UserRole>, any, any, Properties>({
    props: {
        items: {
            type: Array as PropType<UserRole[]>,
            default: () => [],
        },
        roleId: String,
        userId: String,
    },
    data() {
        return {
            busy: false,
            item: null,

            loaded: false,
        };
    },
    created() {
        Promise.resolve()
            .then(() => this.initFromProperties())
            .then(() => this.init())
            .then(() => {
                this.loaded = true;
            });
    },
    methods: {
        initFromProperties() {
            if (!Array.isArray(this.items)) return;

            const index = this.items.findIndex((userRole: UserRole) => userRole.role_id === this.roleId && userRole.user_id === this.userId);
            if (index !== -1) {
                this.item = this.items[index];
            }
        },
        async init() {
            try {
                const response = await this.$authApi.userRole.getMany({
                    filters: {
                        role_id: this.roleId,
                        user_id: this.userId,
                    },
                    page: {
                        limit: 1,
                    },
                });

                if (response.meta.total === 1) {
                    const { 0: item } = response.data;

                    this.item = item;
                }
            } catch (e) {
                // ...
            }
        },
        async add() {
            if (this.busy || this.item) return;

            this.busy = true;

            try {
                const userRole = await this.$authApi.userRole.create({
                    role_id: this.roleId,
                    user_id: this.userId,
                });

                this.item = userRole;

                this.$emit('created', userRole);
            } catch (e) {
                if (e instanceof Error) {
                    this.$emit('failed', e);
                }
            }

            this.busy = false;
        },
        async drop() {
            if (this.busy || !this.item) return;

            this.busy = true;

            try {
                const userRole = await this.$authApi.userRole.delete(this.item.id);

                this.item = null;

                this.$emit('deleted', userRole);
            } catch (e) {
                if (e instanceof Error) {
                    this.$emit('failed', e);
                }
            }

            this.busy = false;
        },
    },
    render(createElement: CreateElement): VNode {
        const vm = this;
        const h = createElement;

        let button = h();

        if (vm.loaded) {
            button = h('button', {
                class: {
                    'btn-success': !vm.item,
                    'btn-danger': vm.item,
                },
                staticClass: 'btn btn-xs',
                on: {
                    click($event: any) {
                        $event.preventDefault();

                        if (vm.item) {
                            return vm.drop.call(null);
                        }

                        return vm.add.call(null);
                    },
                },
            }, [
                h('i', {
                    staticClass: 'fa',
                    class: {
                        'fa-plus': !vm.item,
                        'fa-trash': vm.item,
                    },
                }),
            ]);
        }

        return h('div', [button]);
    },
});

export default UserRoleListItemActions;
