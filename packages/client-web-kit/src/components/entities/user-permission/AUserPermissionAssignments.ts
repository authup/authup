/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    defineComponent, h,
} from 'vue';
import type { Permission } from '@authup/core-kit';
import { SlotName } from '@vuecs/list-controls';
import {
    AUserPermissionAssignment,
} from './AUserPermissionAssignment';
import { APermissions } from '../permission';

export const AUserPermissionAssignments = defineComponent({
    props: {
        entityId: {
            type: String,
            required: true,
        },
    },
    setup(props, { slots }) {
        return () => h(APermissions, {}, {
            [SlotName.ITEM_ACTIONS]: (slotProps: { data: Permission }) => h(
                AUserPermissionAssignment,
                {
                    userId: props.entityId,
                    permissionId: slotProps.data.id,
                    key: slotProps.data.id,
                },
            ),
            ...slots,
        });
    },
});
