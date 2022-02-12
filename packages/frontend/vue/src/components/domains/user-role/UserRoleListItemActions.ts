/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import Vue, { PropType } from 'vue';
import { UserRole } from '@typescript-auth/domains';
import { ComponentListItemData } from '../../type';

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

                this.$bvToast.toast('The user-role relation was successfully created.', {
                    variant: 'success',
                    toaster: 'b-toaster-top-center',
                });

                this.item = userRole;

                this.$emit('created', userRole);
            } catch (e) {
                if (e instanceof Error) {
                    this.$bvToast.toast(e.message, {
                        variant: 'warning',
                        toaster: 'b-toaster-top-center',
                    });

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

                this.$bvToast.toast('The user-role relation was successfully deleted.', {
                    variant: 'success',
                    toaster: 'b-toaster-top-center',
                });

                this.item = null;

                this.$emit('deleted', userRole);
            } catch (e) {
                if (e instanceof Error) {
                    this.$bvToast.toast(e.message, {
                        variant: 'warning',
                        toaster: 'b-toaster-top-center',
                    });

                    this.$emit('failed', e);
                }
            }

            this.busy = false;
        },
    },
    template: `
        <div>
            <button
                v-if="!item && loaded"
                class="btn btn-xs btn-success"
                @click.prevent="add"
            >
                <i class="fa fa-plus" />
            </button>
            <button
                v-if="item && loaded"
                class="btn btn-xs btn-danger"
                @click.prevent="drop"
            >
                <i class="fa fa-trash" />
            </button>
        </div>
    `,
});

export default UserRoleListItemActions;
