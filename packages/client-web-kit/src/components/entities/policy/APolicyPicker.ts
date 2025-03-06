/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Policy } from '@authup/core-kit';
import { SlotName } from '@vuecs/list-controls';
import type { SlotsType } from 'vue';
import {
    defineComponent, h,
} from 'vue';
import { defineEntityPicker, defineEntityPickerVEmitOptions, defineEntityPickerVProps } from '../../utility';
import type { EntityPickerVSlots } from '../../utility';
import { APolicies } from './APolicies';
import { APolicyParentAssignment } from './APolicyParentAssignment';

export const APolicyPicker = defineComponent({
    props: {
        parentId: {
            type: String,
        },
        ...defineEntityPickerVProps<Policy>(),
    },
    slots: Object as SlotsType<EntityPickerVSlots<Policy>>,
    emits: defineEntityPickerVEmitOptions<Policy>(),
    setup(props, { slots, ...setup }) {
        const { render } = defineEntityPicker({
            component: APolicies,
            props,
            setup: {
                ...setup,
                slots: {
                    ...(
                        props.parentId ? {
                            [SlotName.ITEM_ACTIONS]: (
                                slotProps: EntityPickerVSlots<Policy>['itemActions'],
                            ) => h(APolicyParentAssignment, {
                                entity: slotProps.data,
                                entityId: slotProps.data.id,
                                parentId: props.parentId as string,
                            }),
                        } : {}
                    ),
                    ...slots,
                },
            },
        });

        return () => render();
    },
});
