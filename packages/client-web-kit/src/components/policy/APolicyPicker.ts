/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Policy } from '@authup/core-kit';
import { SlotName } from '@vuecs/list-controls';
import {
    defineComponent, h,
} from 'vue';
import type { EntityPickerVSlots } from '../AEntityPicker';
import { AEntityPicker, defineEntityPickerVProps } from '../AEntityPicker';
import { APolicyParentAssignment } from './APolicyParentAssignment';

export const APolicyPicker = defineComponent({
    extends: AEntityPicker,
    props: {
        parentId: {
            type: String,
        },
        ...defineEntityPickerVProps<Policy>(),
    },
    setup(props, { slots, ...setup }) {
        return AEntityPicker.setup!({
            ...props,
            componentName: 'APolicies',
        }, {
            ...setup,
            slots: {
                [SlotName.ITEM_ACTIONS]: (slotProps: EntityPickerVSlots<Policy>) => {
                    if (props.parentId) {
                        return h(APolicyParentAssignment, {
                            entity: slotProps.data,
                            entityId: slotProps.data.id,
                            parentId: props.parentId,
                        });
                    }

                    return undefined;
                },
                ...slots,
            },
        });
    },
});
