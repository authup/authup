<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { defineComponent } from 'vue';
import { VCIcon } from '@vuecs/icon';
import {
    TranslatorTranslationCommonKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import { useTranslations } from '../../core';

// Presentational on purpose: color-mode *storage* is framework-specific
// (client-web uses @vuecs/nuxt's cookie-backed useColorMode()), so the
// component only owns the icon, the localized aria-labels and the toggle
// event — bind it with `v-model:dark="isDark"`.
export default defineComponent({
    components: { VCIcon },
    props: {
        dark: {
            type: Boolean,
            default: false,
        },
    },
    emits: ['update:dark'],
    setup(props, { emit }) {
        const translations = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.COMMON,
                key: TranslatorTranslationCommonKey.SWITCH_TO_LIGHT_MODE,
            },
            {
                namespace: TranslatorTranslationNamespace.COMMON,
                key: TranslatorTranslationCommonKey.SWITCH_TO_DARK_MODE,
            },
        ]);

        const toggle = () => {
            emit('update:dark', !props.dark);
        };

        return {
            toggle,
            translations,
        };
    },
});
</script>
<template>
    <button
        type="button"
        :aria-label="dark ? translations.switchToLightMode : translations.switchToDarkMode"
        :aria-pressed="dark ? 'true' : 'false'"
        @click.prevent="toggle"
    >
        <VCIcon :name="dark ? 'fa6-solid:sun' : 'fa6-solid:moon'" />
    </button>
</template>
