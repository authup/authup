import { 
    SlotName, 
    hasNormalizedSlot, 
    normalizeSlot, 
    useTranslation,  
} from '../../../core';
import { defineComponent } from 'vue';

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
            namespace: props.group,
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
