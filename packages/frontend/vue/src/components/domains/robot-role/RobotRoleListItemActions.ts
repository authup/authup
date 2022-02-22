/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import Vue, { CreateElement, PropType, VNode } from 'vue';
import { RobotRole } from '@typescript-auth/domains';
import { ComponentListItemData } from '../../helpers';
import { useHTTPClient } from '../../../utils';

export type RobotRoleListItemActionsProperties = {
    items?: RobotRole[],
    roleId: string,
    robotId: string
};

export const RobotRoleListItemActions = Vue.extend<
ComponentListItemData<RobotRole>,
any,
any,
RobotRoleListItemActionsProperties
>({
    name: 'RobotRoleListItemActions',
    props: {
        items: {
            type: Array as PropType<RobotRole[]>,
            default: () => [],
        },
        roleId: String,
        robotId: String,
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

            const index = this.items.findIndex((item: RobotRole) => item.role_id === this.roleId && item.robot_id === this.robotId);
            if (index !== -1) {
                this.item = this.items[index];
            }
        },
        async init() {
            try {
                const response = await useHTTPClient().robotRole.getMany({
                    filters: {
                        role_id: this.roleId,
                        robot_id: this.robotId,
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
                if (e instanceof Error) {
                    this.$emit('failed', e);
                }
            }
        },
        async add() {
            if (this.busy || this.item) return;

            this.busy = true;

            try {
                const userRole = await useHTTPClient().robotRole.create({
                    role_id: this.roleId,
                    robot_id: this.robotId,
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
                const userRole = await useHTTPClient().robotRole.delete(this.item.id);

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

export default RobotRoleListItemActions;
