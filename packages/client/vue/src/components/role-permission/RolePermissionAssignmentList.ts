/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    defineComponent, h,
} from 'vue';
import type { Permission } from '@authup/core';
import { Role } from '@authup/core';
import { SlotName } from '@vue-layout/hyperscript';
import {
    RolePermissionAssignmentListItemActions,
} from './RolePermissionAssignmentListItemActions';
import { PermissionList } from '../permission';

export const RolePermissionAssignmentList = defineComponent({
    name: 'RolePermissionAssignmentList',
    props: {
        entityId: {
            type: String,
            required: true,
        },
    },
    setup(props) {
        return () => h(PermissionList, {}, {
            [SlotName.ITEM_ACTIONS]: (slotProps: { data: Permission }) => h(
                RolePermissionAssignmentListItemActions,
                {
                    roleId: props.entityId,
                    permissionId: slotProps.data.id,
                },
            ),
        });
    },
});
