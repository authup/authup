/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    defineComponent, h,
} from 'vue';
import type { Scope } from '@authup/core';
import { SlotName } from '@vue-layout/list-controls';
import { ScopeList } from '../scope';
import {
    ClientScopeAssignmentListItemActions,
} from './ClientScopeAssignmentListItemActions';

export const ClientScopeAssignmentList = defineComponent({
    name: 'ClientScopeAssignmentList',
    props: {
        entityId: {
            type: String,
            required: true,
        },
    },
    setup(props) {
        return () => h(ScopeList, {}, {
            [SlotName.ITEM_ACTIONS]: (slotProps: { data: Scope }) => h(
                ClientScopeAssignmentListItemActions,
                {
                    clientId: props.entityId,
                    scopeId: slotProps.data.id,
                },
            ),
        });
    },
});
