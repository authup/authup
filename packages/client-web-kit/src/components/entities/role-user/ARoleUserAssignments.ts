/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    defineComponent, h,
} from 'vue';
import type { User } from '@authup/core-kit';
import { SlotName } from '@vuecs/list-controls';
import { AUserRoleAssignment } from '../user-role';
import { AUsers } from '../user/AUsers';

export const ARoleUserAssignments = defineComponent({
    props: {
        entityId: String,
    },
    setup(props, { slots }) {
        return () => h(AUsers, {}, {
            [SlotName.ITEM_ACTIONS]: (slotProps: { data: User }) => h(
                AUserRoleAssignment,
                {
                    roleId: props.entityId,
                    userId: slotProps.data.id,
                    key: slotProps.data.id,
                },
            ),
            ...slots,
        });
    },
});

export default ARoleUserAssignments;
