import { SlotName } from '@vuecs/list-controls';
import { defineComponent } from 'vue';
import { hasNormalizedSlot, normalizeSlot, useTranslation } from '../../../core';

export const ATranslation = defineComponent({
    props: {
        group: {
            type: String,
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
    },
    setup(props, { slots }) {
        const translation = useTranslation({
            group: props.group,
            key: props.name,
        });

        return () => {
            if (hasNormalizedSlot(SlotName.DEFAULT, slots)) {
                return normalizeSlot(SlotName.DEFAULT, { data: translation.value }, slots);
            }

            return [
                translation.value,
            ];
        };
    },
});
