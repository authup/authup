/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PropType } from 'vue';
import {
    VNodeArrayChildren, defineComponent, h, ref,
} from 'vue';
import type { RobotRole } from '@authup/core';
import { renderEntityListItemAssignmentButton } from '../../core/entity-list';
import { useAPIClient } from '../../core';

export type RobotRoleListItemActionsProperties = {
    items?: RobotRole[],
    roleId: string,
    robotId: string
};

export const RobotRoleAssignmentListItemActions = defineComponent({
    name: 'RobotRoleAssignmentListItemActions',
    props: {
        items: {
            type: Array as PropType<RobotRole[]>,
            default: () => [],
        },
        roleId: String,
        robotId: String,
    },
    emits: ['created', 'deleted', 'updated', 'failed'],
    setup(props, ctx) {
        const busy = ref(false);
        const loaded = ref(false);
        const item = ref<RobotRole | null>(null);

        const initForm = () => {
            if (!Array.isArray(props.items)) return;

            const index = props.items.findIndex((item: RobotRole) => item.role_id === props.roleId && item.robot_id === props.robotId);

            if (index !== -1) {
                item.value = props.items[index];
            }
        };
        const init = async () => {
            try {
                const response = await useAPIClient().robotRole.getMany({
                    filters: {
                        role_id: props.roleId,
                        robot_id: props.robotId,
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
                const data = await useAPIClient().robotRole.create({
                    robot_id: props.robotId,
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
                const data = await useAPIClient().robotRole.delete(item.value.id);

                item.value = null;

                ctx.emit('deleted', data);
            } catch (e) {
                if (e instanceof Error) {
                    ctx.emit('failed', e);
                }
            }

            busy.value = false;
        };

        return () => renderEntityListItemAssignmentButton({
            add,
            drop,
            item,
            loaded,
        });
    },
});

export default RobotRoleAssignmentListItemActions;
