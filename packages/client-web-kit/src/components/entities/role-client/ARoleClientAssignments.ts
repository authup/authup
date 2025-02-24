/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    defineComponent, h,
} from 'vue';
import type { Client } from '@authup/core-kit';
import { SlotName } from '@vuecs/list-controls';
import { AClients } from '../client';
import { AClientRoleAssignment } from '../client-role';

export const ARoleClientAssignments = defineComponent({
    props: {
        entityId: String,
    },
    setup(props) {
        return () => h(AClients, {}, {
            [SlotName.ITEM_ACTIONS]: (slotProps: { data: Client }) => h(
                AClientRoleAssignment,
                {
                    roleId: props.entityId,
                    clientId: slotProps.data.id,
                    key: slotProps.data.id,
                },
            ),
        });
    },
});

export default ARoleClientAssignments;
