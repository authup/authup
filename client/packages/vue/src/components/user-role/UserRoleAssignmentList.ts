/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    defineComponent, h,
} from 'vue';
import type { Role } from '@authup/core';
import { SlotName } from '@vue-layout/list-controls';
import { RoleList } from '../role';
import { UserRoleAssignAction } from './UserRoleAssignAction';

export const UserRoleAssignmentList = defineComponent({
    props: {
        entityId: String,
    },
    setup(props, { slots }) {
        return () => h(RoleList, {}, {
            [SlotName.ITEM_ACTIONS]: (slotProps: { data: Role }) => h(
                UserRoleAssignAction,
                {
                    userId: props.entityId,
                    roleId: slotProps.data.id,
                },
            ),
            ...slots,
        });
    },
});

export default UserRoleAssignmentList;