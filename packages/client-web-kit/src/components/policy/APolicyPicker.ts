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
import { defineResourcePicker, defineResourcePickerVEmitOptions, defineResourcePickerVProps } from '../utility/resource/picker/module';
import type { ResourcePickerVSlots } from '../utility/resource/picker/types';
import { APolicies } from './APolicies';
import { APolicyParentAssignment } from './APolicyParentAssignment';

export const APolicyPicker = defineComponent({
    props: {
        parentId: {
            type: String,
        },
        ...defineResourcePickerVProps<Policy>(),
    },
    slots: Object as SlotsType<ResourcePickerVSlots<Policy>>,
    emits: defineResourcePickerVEmitOptions<Policy>(),
    setup(props, { slots, ...setup }) {
        const { render } = defineResourcePicker({
            component: APolicies,
            props,
            setup: {
                ...setup,
                slots: {
                    ...(
                        props.parentId ? {
                            [SlotName.ITEM_ACTIONS]: (
                                slotProps: ResourcePickerVSlots<Policy>['itemActions'],
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
