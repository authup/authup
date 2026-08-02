<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { AUserAuthenticators, useTranslations } from '@authup/client-web-kit';
import {
    TranslatorTranslationAppKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import { defineComponent } from 'vue';

export default defineComponent({
    components: { AUserAuthenticators },
    setup() {
        const translations = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.APP,
                key: TranslatorTranslationAppKey.MFA_SECURITY_TITLE,
            },
            {
                namespace: TranslatorTranslationNamespace.APP,
                key: TranslatorTranslationAppKey.MFA_SECURITY_HINT,
            },
        ]);

        return { translations };
    },
});
</script>
<template>
    <div>
        <h2 class="text-lg font-semibold mb-1">
            {{ translations.mfaSecurityTitle }}
        </h2>
        <p class="text-fg-muted mb-3">
            {{ translations.mfaSecurityHint }}
        </p>
        <AUserAuthenticators user-id="@me" />
    </div>
</template>
