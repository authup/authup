/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PropType } from 'vue';
import { defineComponent, ref } from 'vue';
import type { UserPermission } from '@authup/core';
import { renderListItemAssignmentButton } from '../../composables';
import { useAPIClient } from '../../utils';

export const UserPermissionAssignmentListItemActions = defineComponent({
    name: 'UserPermissionAssignmentListItemActions',
    props: {
        items: {
            type: Array as PropType<UserPermission[]>,
            default: () => [],
        },
        userId: String,
        permissionId: String,
    },
    emits: ['created', 'deleted', 'updated', 'failed'],
    setup(props, ctx) {
        const busy = ref(false);
        const loaded = ref(false);
        const item = ref<UserPermission | null>(null);

        const initForm = () => {
            if (!Array.isArray(props.items)) return;

            const index = props.items.findIndex((item: UserPermission) => item.user_id === props.userId &&
                item.permission_id === props.permissionId);

            if (index !== -1) {
                item.value = props.items[index];
            }
        };
        const init = async () => {
            try {
                const response = await useAPIClient().userPermission.getMany({
                    filters: {
                        user_id: props.userId,
                        permission_id: props.permissionId,
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
                const data = await useAPIClient().userPermission.create({
                    user_id: props.userId,
                    permission_id: props.permissionId,
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
                const data = await useAPIClient().userPermission.delete(item.value.id);

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
