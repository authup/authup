/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineComponent, h } from 'vue';
import type { Client } from '@authup/core-kit';
import { SlotName } from '@vuecs/list-controls';
import { AClients } from '../client';
import { AClientScopeAssignment } from '../client-scope';

export const AScopeClientAssignments = defineComponent({
    props: {
        entityId: {
            type: String,
            required: true,
        },
    },
    setup(props, { slots }) {
        return () => h(AClients, {}, {
            [SlotName.ITEM_ACTIONS]: (slotProps: { data: Client }) => h(
                AClientScopeAssignment,
                {
                    scopeId: props.entityId,
                    clientId: slotProps.data.id,
                    key: slotProps.data.id,
                },
            ),
            ...slots,
        });
    },
});

export default AScopeClientAssignments;
