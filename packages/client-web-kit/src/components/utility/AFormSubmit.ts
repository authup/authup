import { defineComponent } from 'vue';
import { buildFormSubmitWithTranslations, createFormSubmitTranslations } from '../../core';

export const AFormSubmit = defineComponent({
    props: {
        isBusy: {
            type: Boolean,
            default: false,
        },
        isEditing: {
            type: Boolean,
            default: false,
        },
        isInvalid: {
            type: Boolean,
            default: false,
        },
    },
    emits: ['submit'],
    setup(props, { emit }) {
        const translationsSubmit = createFormSubmitTranslations();

        const render = () => buildFormSubmitWithTranslations({
            submit: () => emit('submit'),
            busy: props.isBusy,
            isEditing: props.isEditing,
            invalid: props.isInvalid,
        }, translationsSubmit);

        return () => render();
    },
});
