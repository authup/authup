/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    defineComponent, h,
} from 'vue';
import type { Scope } from '@authup/core-kit';
import { SlotName } from '@vuecs/list-controls';
import { AScopes } from '../scope';
import {
    AClientScopeAssignment,
} from './AClientScopeAssignment';

export const AClientScopeAssignments = defineComponent({
    props: {
        entityId: {
            type: String,
            required: true,
        },
    },
    setup(props, { slots }) {
        return () => h(AScopes, { }, {
            [SlotName.ITEM_ACTIONS]: (slotProps: { data: Scope }) => h(
                AClientScopeAssignment,
                {
                    clientId: props.entityId,
                    scopeId: slotProps.data.id,
                    key: slotProps.data.id,
                },
            ),
            ...slots,
        });
    },
});
