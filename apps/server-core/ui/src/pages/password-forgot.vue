<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { AAuthShell, APasswordForgotForm, useTranslations } from '@authup/client-web-kit';
import type { StatusResponseFeatures } from '@authup/core-http-kit';
import { TranslatorTranslationClientKey, TranslatorTranslationNamespace } from '@authup/i18n';
import { defineComponent } from 'vue';
import { injectPayload } from '../di';

export default defineComponent({
    components: { AAuthShell, APasswordForgotForm },
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
            {
                namespace: TranslatorTranslationNamespace.CLIENT,
                key: TranslatorTranslationClientKey.RESET_PASSWORD,
            },
        ]);

        const resetPath = (() => {
            const params = new URLSearchParams();
            if (payload.data.realmId) {
                params.set('realm_id', payload.data.realmId);
            }
            if (payload.data.redirect) {
                params.set('redirect', payload.data.redirect);
            }
            const qs = params.toString();
            return `/password-reset${qs ? `?${qs}` : ''}`;
        })();

        return {
            data: payload.data,
            translations,
            resetPath,
        };
    },
});
</script>
<template>
    <AAuthShell>
        <template v-if="data.features && data.features.passwordRecovery">
            <APasswordForgotForm
                :realm-id="data.realmId"
                :back-link="data.redirect ? { href: data.redirect } : undefined"
            />

            <div class="text-center">
                <a :href="resetPath">{{ translations.resetPassword }}</a>
            </div>
        </template>
        <div
            v-else
            class="alert alert-warning"
        >
            {{ translations.workflowDisabled }}
        </div>
    </AAuthShell>
</template>
