/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineComponent, h } from 'vue';
import type { Client } from '@authup/core';
import { SlotName } from '@vue-layout/list-controls';
import { ClientList } from '../client';
import { ClientScopeAssignAction } from '../client-scope';

export const ScopeClientAssignmentList = defineComponent({
    props: {
        entityId: {
            type: String,
            required: true,
        },
    },
    setup(props, { slots }) {
        return () => h(ClientList, {}, {
            [SlotName.ITEM_ACTIONS]: (slotProps: { data: Client }) => h(
                ClientScopeAssignAction,
                {
                    scopeId: props.entityId,
                    clientId: slotProps.data.id,
                },
            ),
            ...slots,
        });
    },
});

export default ScopeClientAssignmentList;
