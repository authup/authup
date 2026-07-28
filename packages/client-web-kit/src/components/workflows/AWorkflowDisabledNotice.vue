<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { TranslatorTranslationClientKey, TranslatorTranslationNamespace } from '@authup/i18n';
import { VCAlert } from '@vuecs/elements';
import { defineComponent } from 'vue';
import { useTranslations } from '../../core';

// Shared "this workflow is disabled" notice rendered by the SSR auth
// workflow pages (register, activate, password-forgot, password-reset)
// when the corresponding feature flag is off. A localized alert instead
// of a 404 — stale email links should not dead-end.
export default defineComponent({
    components: { VCAlert },
    setup() {
        const translations = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.CLIENT,
                key: TranslatorTranslationClientKey.WORKFLOW_DISABLED,
            },
        ]);

        return { translations };
    },
});
</script>
<template>
    <VCAlert
        color="warning"
        variant="soft"
        class="mb-3"
    >
        {{ translations.workflowDisabled }}
    </VCAlert>
</template>
