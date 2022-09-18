/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    defineComponent, h,
} from 'vue';
import { User } from '@authelion/common';
import { SlotName } from '@vue-layout/utils';
import { UserRoleAssignmentListItemActions } from '../user-role';
import { UserList } from '../user/UserList';

export const RoleUserAssignmentList = defineComponent({
    name: 'RoleUserAssignmentList',
    props: {
        entityId: String,
    },
    setup(props) {
        return () => h(UserList, {}, {
            [SlotName.ITEM_ACTIONS]: (slotProps: { item: User }) => h(
                UserRoleAssignmentListItemActions,
                {
                    roleId: props.entityId,
                    userId: slotProps.item.id,
                },
            ),
        });
    },
});

export default RoleUserAssignmentList;
