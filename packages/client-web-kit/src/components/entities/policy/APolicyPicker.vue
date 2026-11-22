<!--
  Copyright (c) 2025.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
-->

<script lang="ts">
import type { Policy } from '@authup/core-kit';
import { SlotName } from '../../../core/index.ts';
import type { SlotsType } from 'vue';
import { defineComponent, h } from 'vue';
import { defineEntityPicker, defineEntityPickerVEmitOptions, defineEntityPickerVProps } from '../../utility/index.ts';
import type { EntityPickerVSlots } from '../../utility/index.ts';
import { APolicies } from './APolicies.ts';
import { APolicyParentAssignment } from './APolicyParentAssignment.ts';

export default defineComponent({
    props: {
        parentId: { type: String },
        ...defineEntityPickerVProps<Policy>(),
    },
    emits: defineEntityPickerVEmitOptions<Policy>(),
    slots: Object as SlotsType<EntityPickerVSlots<Policy>>,
    setup(props, {
        slots,
        ...setup
    }) {
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
</script>
