/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    defineComponent, h,
} from 'vue';
import { Role } from '@authelion/common';
import { SlotName } from '@vue-layout/hyperscript';
import { RoleList } from '../role';
import { UserRoleAssignmentListItemActions } from './UserRoleAssignmentListItemActions';

export const UserRoleAssignmentList = defineComponent({
    name: 'UserRoleAssignmentList',
    props: {
        entityId: String,
    },
    setup(props) {
        return () => h(RoleList, {}, {
            [SlotName.ITEM_ACTIONS]: (slotProps: { data: Role }) => h(
                UserRoleAssignmentListItemActions,
                {
                    userId: props.entityId,
                    roleId: slotProps.data.id,
                },
            ),
        });
    },
});

export default UserRoleAssignmentList;
