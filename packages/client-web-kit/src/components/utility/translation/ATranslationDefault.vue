<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import type { TranslatorTranslationDefaultKey } from '../../../core';
import { TranslatorTranslationGroup } from '../../../core';
import { ATranslation } from './ATranslation';

export default defineComponent({
    components: { ATranslation },
    props: {
        name: {
            type: String as PropType<`${TranslatorTranslationDefaultKey}`>,
            required: true,
        },
    },
    setup() {
        return { TranslatorTranslationGroup };
    },
});
</script>
<template>
    <ATranslation
        :group="TranslatorTranslationGroup.DEFAULT"
        :name="name"
    />
</template>
