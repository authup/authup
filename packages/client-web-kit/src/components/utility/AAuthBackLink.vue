<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import type { LinkProperties } from '@vuecs/link';
import { VCLink } from '@vuecs/link';
import { TranslatorTranslationClientKey, TranslatorTranslationNamespace } from '@authup/i18n';
import { useTranslations } from '../../core';

// Shared "‹ Back to login" affordance for the auth workflow forms. Renders
// nothing unless a link is supplied, so callers can pass an optional prop
// straight through.
export default defineComponent({
    components: { VCLink },
    props: { link: { type: Object as PropType<LinkProperties> } },
    setup() {
        const translations = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.CLIENT,
                key: TranslatorTranslationClientKey.BACK_TO_LOGIN,
            },
        ]);

        return { translations };
    },
});
</script>
<template>
    <div
        v-if="link"
        class="text-center mt-3"
    >
        <VCLink
            v-bind="link"
            class="a-auth-back-link"
        >
            <VCIcon name="fa6-solid:chevron-left" />
            {{ translations.backToLogin }}
        </VCLink>
    </div>
</template>
