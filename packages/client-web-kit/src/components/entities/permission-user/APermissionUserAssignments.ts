/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineComponent, h } from 'vue';
import type { User } from '@authup/core-kit';
import { SlotName } from '@vuecs/list-controls';
import { AUserPermissionAssignment } from '../user-permission';
import { AUsers } from '../user';

export const APermissionUserAssignments = defineComponent({
    props: {
        entityId: {
            type: String,
            required: true,
        },
    },
    setup(props, { slots }) {
        return () => h(AUsers, {}, {
            [SlotName.ITEM_ACTIONS]: (slotProps: { data: User }) => h(
                AUserPermissionAssignment,
                {
                    permissionId: props.entityId,
                    userId: slotProps.data.id,
                    key: slotProps.data.id,
                },
            ),
            ...slots,
        });
    },
});

export default APermissionUserAssignments;
