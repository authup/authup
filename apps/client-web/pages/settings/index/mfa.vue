<script lang="ts">
import { TranslatorTranslationAppKey, TranslatorTranslationNamespace } from '@authup/i18n';
import { AUserAuthenticators, useTranslationsForNamespace } from '@authup/client-web-kit';
import { defineComponent } from 'vue';
import { definePageMeta } from '#imports';
import { LayoutKey } from '~/config/layout';

export default defineComponent({
    components: { AUserAuthenticators },
    setup() {
        definePageMeta({ [LayoutKey.REQUIRED_LOGGED_IN]: true });

        const translations = useTranslationsForNamespace(
            TranslatorTranslationNamespace.APP,
            [
                { key: TranslatorTranslationAppKey.MFA_SECURITY_TITLE },
            ],
        );

        return { translations };
    },
});
</script>
<template>
    <div>
        <h6 class="title">
            {{ translations.mfaSecurityTitle }}
        </h6>
        <AUserAuthenticators user-id="@me" />
    </div>
</template>
