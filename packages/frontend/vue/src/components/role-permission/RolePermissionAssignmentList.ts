/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    defineComponent, h,
} from 'vue';
import { Permission, Role } from '@authelion/common';
import { SlotName } from '@vue-layout/utils';
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
            [SlotName.ITEM_ACTIONS]: (slotProps: { item: Permission }) => h(
                RolePermissionAssignmentListItemActions,
                {
                    roleId: props.entityId,
                    permissionId: slotProps.item.id,
                },
            ),
        });
    },
});
