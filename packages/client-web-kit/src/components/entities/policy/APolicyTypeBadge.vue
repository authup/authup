<!--
  Copyright (c) 2026.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
-->

<script lang="ts">
import { computed, defineComponent } from 'vue';
import { VCBadge } from '@vuecs/elements';
import {
    TranslatorTranslationClientKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import { useTranslationsForNamespace } from '../../../core';
import { POLICY_TYPE_TRANSLATION_KEYS } from './policy-type';

export default defineComponent({
    components: { VCBadge },
    props: {
        type: {
            type: String,
            required: true,
        },
    },
    setup(props) {
        const translations = useTranslationsForNamespace(
            TranslatorTranslationNamespace.CLIENT,
            [
                { key: TranslatorTranslationClientKey.POLICY_TYPE_COMPOSITE },
                { key: TranslatorTranslationClientKey.POLICY_TYPE_DATE },
                { key: TranslatorTranslationClientKey.POLICY_TYPE_TIME },
                { key: TranslatorTranslationClientKey.POLICY_TYPE_ATTRIBUTE_NAMES },
                { key: TranslatorTranslationClientKey.POLICY_TYPE_ATTRIBUTES },
                { key: TranslatorTranslationClientKey.POLICY_TYPE_REALM_MATCH },
                { key: TranslatorTranslationClientKey.POLICY_TYPE_IDENTITY },
                { key: TranslatorTranslationClientKey.POLICY_TYPE_PERMISSION_BINDING },
            ],
        );

        const label = computed(() => {
            const key = POLICY_TYPE_TRANSLATION_KEYS[props.type as keyof typeof POLICY_TYPE_TRANSLATION_KEYS];
            if (key) {
                return translations[key];
            }

            return props.type;
        });

        return { label };
    },
});
</script>
<template>
    <VCBadge
        color="info"
        variant="solid"
    >
        {{ label }}
    </VCBadge>
</template>
