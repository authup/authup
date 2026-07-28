<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import {
    AAuthShell, 
    APasswordForgotForm, 
    AWorkflowDisabledNotice, 
    useTranslations,
} from '@authup/client-web-kit';
import type { StatusResponseFeatures } from '@authup/core-http-kit';
import { TranslatorTranslationClientKey, TranslatorTranslationNamespace } from '@authup/i18n';
import { defineComponent } from 'vue';
import { useBasePath } from '../base-path';
import { injectPayload } from '../di';

export default defineComponent({
    components: {
        AAuthShell,
        APasswordForgotForm,
        AWorkflowDisabledNotice,
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
                key: TranslatorTranslationClientKey.RESET_PASSWORD,
            },
        ]);

        const withBasePath = useBasePath();

        const resetPath = (() => {
            const params = new URLSearchParams();
            if (payload.data.realmId) {
                params.set('realmId', payload.data.realmId);
            }
            if (payload.data.redirect) {
                params.set('redirect', payload.data.redirect);
            }
            const qs = params.toString();
            return withBasePath(`/password-reset${qs ? `?${qs}` : ''}`);
        })();

        return {
            data: payload.data,
            translations,
            resetPath,
            withBasePath,
        };
    },
});
</script>
<template>
    <AAuthShell>
        <template v-if="data.features && data.features.passwordRecovery">
            <APasswordForgotForm
                :realm-id="data.realmId"
                :back-link="data.redirect ? { href: withBasePath(data.redirect) } : undefined"
            />

            <div class="text-center">
                <a :href="resetPath">{{ translations.resetPassword }}</a>
            </div>
        </template>
        <AWorkflowDisabledNotice v-else />
    </AAuthShell>
</template>
