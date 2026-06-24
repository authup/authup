<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { AAuthShell, ARegisterForm, useTranslations } from '@authup/client-web-kit';
import type { StatusResponseFeatures } from '@authup/core-http-kit';
import { TranslatorTranslationClientKey, TranslatorTranslationNamespace } from '@authup/i18n';
import { VCAlert } from '@vuecs/elements';
import { defineComponent } from 'vue';
import { useBasePath } from '../base-path';
import { injectPayload } from '../di';

export default defineComponent({
    components: {
        AAuthShell, 
        ARegisterForm, 
        VCAlert, 
    },
    setup() {
        const payload = injectPayload<{
            features?: StatusResponseFeatures,
            realmId?: string,
            redirect?: string,
        }>();

        const translations = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.CLIENT,
                key: TranslatorTranslationClientKey.WORKFLOW_DISABLED,
            },
        ]);

        const withBasePath = useBasePath();

        return {
            data: payload.data,
            translations,
            withBasePath,
        };
    },
});
</script>
<template>
    <AAuthShell>
        <ARegisterForm
            v-if="data.features && data.features.registration"
            :realm-id="data.realmId"
            :back-link="data.redirect ? { href: withBasePath(data.redirect) } : undefined"
        />
        <VCAlert
            v-else
            color="warning"
            variant="soft"
            class="mb-3"
        >
            {{ translations.workflowDisabled }}
        </VCAlert>
    </AAuthShell>
</template>
