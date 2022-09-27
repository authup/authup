/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineComponent, h } from 'vue';
import { User } from '@authelion/common';
import { SlotName } from '@vue-layout/utils';
import { UserPermissionAssignmentListItemActions } from '../user-permission';
import { UserList } from '../user';

export const PermissionUserAssignmentList = defineComponent({
    name: 'PermissionUserAssignmentList',
    props: {
        entityId: {
            type: String,
            required: true,
        },
    },
    setup(props) {
        return () => h(UserList, {}, {
            [SlotName.ITEM_ACTIONS]: (slotProps: { data: User }) => h(
                UserPermissionAssignmentListItemActions,
                {
                    permissionId: props.entityId,
                    userId: slotProps.data.id,
                },
            ),

        });
    },
});

export default PermissionUserAssignmentList;
