<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { AActivateForm, AAuthShell, useTranslations } from '@authup/client-web-kit';
import type { StatusResponseFeatures } from '@authup/core-http-kit';
import { TranslatorTranslationClientKey, TranslatorTranslationNamespace } from '@authup/i18n';
import { defineComponent } from 'vue';
import { useBasePath } from '../base-path';
import { injectPayload } from '../di';

export default defineComponent({
    components: { AActivateForm, AAuthShell },
    setup() {
        const payload = injectPayload<{
            features?: StatusResponseFeatures,
            token?: string,
            redirect?: string,
        }>();

        const translations = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.CLIENT,
                key: TranslatorTranslationClientKey.WORKFLOW_DISABLED,
            },
            {
                namespace: TranslatorTranslationNamespace.CLIENT,
                key: TranslatorTranslationClientKey.BACK_TO_LOGIN,
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
        <!--
            Activation tokens are only issued when email verification is on,
            so gate on that capability — otherwise the form is a dead end.
        -->
        <AActivateForm
            v-if="data.features && data.features.emailVerification"
            :token="data.token"
        />
        <div
            v-else
            class="alert alert-warning"
        >
            {{ translations.workflowDisabled }}
        </div>

        <div
            v-if="data.redirect"
            class="text-center"
        >
            <a :href="withBasePath(data.redirect)">{{ translations.backToLogin }}</a>
        </div>
    </AAuthShell>
</template>
