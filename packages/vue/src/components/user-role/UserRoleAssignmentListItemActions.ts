/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    PropType, defineComponent, ref,
} from 'vue';
import { UserRole } from '@authup/common';
import { renderListItemAssignmentButton } from '../../composables';
import { useHTTPClient } from '../../utils';

export const UserRoleAssignmentListItemActions = defineComponent({
    name: 'UserRoleAssignmentListItemActions',
    props: {
        items: {
            type: Array as PropType<UserRole[]>,
            default: () => [],
        },
        roleId: String,
        userId: String,
    },
    emits: ['created', 'deleted', 'updated', 'failed'],
    setup(props, ctx) {
        const busy = ref(false);
        const loaded = ref(false);
        const item = ref<UserRole | null>(null);

        const initForm = () => {
            if (!Array.isArray(props.items)) return;

            const index = props.items.findIndex((userRole: UserRole) => userRole.role_id === props.roleId &&
                userRole.user_id === props.userId);

            if (index !== -1) {
                item.value = props.items[index];
            }
        };

        const init = async () => {
            try {
                const response = await useHTTPClient().userRole.getMany({
                    filters: {
                        user_id: props.userId,
                        role_id: props.roleId,
                    },
                    page: {
                        limit: 1,
                    },
                });

                if (response.meta.total === 1) {
                    const { 0: data } = response.data;

                    item.value = data;
                }
            } catch (e) {
                if (e instanceof Error) {
                    ctx.emit('failed', e);
                }
            }
        };

        Promise.resolve()
            .then(() => initForm())
            .then(() => init())
            .then(() => {
                loaded.value = true;
            });

        const add = async () => {
            if (busy.value || item.value) return;

            busy.value = true;

            try {
                const data = await useHTTPClient().userRole.create({
                    user_id: props.userId,
                    role_id: props.roleId,
                });

                item.value = data;

                ctx.emit('created', data);
            } catch (e) {
                if (e instanceof Error) {
                    ctx.emit('failed', e);
                }
            }

            busy.value = false;
        };

        const drop = async () => {
            if (busy.value || !item.value) return;

            busy.value = true;

            try {
                const data = await useHTTPClient().userRole.delete(item.value.id);

                item.value = null;

                ctx.emit('deleted', data);
            } catch (e) {
                if (e instanceof Error) {
                    ctx.emit('failed', e);
                }
            }

            busy.value = false;
        };

        return () => renderListItemAssignmentButton({
            add,
            drop,
            item,
            loaded,
        });
    },
});

export default UserRoleAssignmentListItemActions;
