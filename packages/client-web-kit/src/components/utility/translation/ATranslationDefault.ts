import type { PropType } from 'vue';
import { defineComponent, h } from 'vue';
import type { TranslatorTranslationDefaultKey } from '../../../core';
import {
    TranslatorTranslationGroup,
} from '../../../core';
import { ATranslation } from './ATranslation';

export const ATranslationDefault = defineComponent({
    props: {
        name: {
            type: String as PropType<`${TranslatorTranslationDefaultKey}`>,
            required: true,
        },
    },
    setup(props) {
        return () => h(ATranslation, {
            group: TranslatorTranslationGroup.DEFAULT,
            name: props.name,
        });
    },
});
