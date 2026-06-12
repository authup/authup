<!--
  Copyright (c) 2026.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
-->

<script lang="ts">
import { computed, defineComponent } from 'vue';
import { BuiltInPolicyType } from '@authup/access';
import {
    TranslatorTranslationClientKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import { useTranslationsForNamespace } from '../../../core';

const typeKeys = {
    [BuiltInPolicyType.COMPOSITE]: TranslatorTranslationClientKey.POLICY_TYPE_COMPOSITE,
    [BuiltInPolicyType.DATE]: TranslatorTranslationClientKey.POLICY_TYPE_DATE,
    [BuiltInPolicyType.TIME]: TranslatorTranslationClientKey.POLICY_TYPE_TIME,
    [BuiltInPolicyType.ATTRIBUTE_NAMES]: TranslatorTranslationClientKey.POLICY_TYPE_ATTRIBUTE_NAMES,
    [BuiltInPolicyType.ATTRIBUTES]: TranslatorTranslationClientKey.POLICY_TYPE_ATTRIBUTES,
    [BuiltInPolicyType.REALM_MATCH]: TranslatorTranslationClientKey.POLICY_TYPE_REALM_MATCH,
    [BuiltInPolicyType.IDENTITY]: TranslatorTranslationClientKey.POLICY_TYPE_IDENTITY,
    [BuiltInPolicyType.PERMISSION_BINDING]: TranslatorTranslationClientKey.POLICY_TYPE_PERMISSION_BINDING,
} as const;

export default defineComponent({
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
            const key = typeKeys[props.type as keyof typeof typeKeys];
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
    <span class="badge bg-info-500">{{ label }}</span>
</template>
