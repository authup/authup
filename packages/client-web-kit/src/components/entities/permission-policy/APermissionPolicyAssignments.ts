/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineComponent, h } from 'vue';
import type { Policy } from '@authup/core-kit';
import { SlotName } from '@vuecs/list-controls';
import { APermissionPolicyAssignment } from './APermissionPolicyAssignment';
import { APolicies } from '../policy';

export const APermissionPolicyAssignments = defineComponent({
    props: {
        entityId: {
            type: String,
            required: true,
        },
    },
    setup(props, { slots }) {
        return () => h(APolicies, { query: { filters: { parent_id: null } } }, {
            [SlotName.ITEM_ACTIONS]: (slotProps: { data: Policy }) => h(
                APermissionPolicyAssignment,
                {
                    permissionId: props.entityId,
                    policyId: slotProps.data.id,
                    key: slotProps.data.id,
                },
            ),
            ...slots,
        });
    },
});

export default APermissionPolicyAssignments;
