/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineComponent, h } from 'vue';
import type { Permission } from '@authup/core-kit';
import { SlotName } from '@vuecs/list-controls';
import {
    AClientPermissionAssignment,
} from './AClientPermissionAssignment';
import { APermissions } from '../permission';

export const AClientPermissionAssignments = defineComponent({
    props: {
        entityId: {
            type: String,
            required: true,
        },
    },
    setup(props, { slots }) {
        return () => h(APermissions, {}, {
            [SlotName.ITEM_ACTIONS]: (slotProps: { data: Permission }) => h(
                AClientPermissionAssignment,
                {
                    clientInd: props.entityId,
                    permissionId: slotProps.data.id,
                    key: slotProps.data.id,
                },
            ),
            ...slots,
        });
    },
});

export default AClientPermissionAssignments;
