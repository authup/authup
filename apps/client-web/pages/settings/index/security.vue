<script lang="ts">
import { storeToRefs } from 'pinia';
import { TranslatorTranslationAppKey, TranslatorTranslationFieldKey, TranslatorTranslationNamespace } from '@authup/i18n';
import {
    AUserAuthenticators,
    AUserPasswordForm,
    injectStore,
    useTranslations,
    useTranslator,
} from '@authup/client-web-kit';
import { definePageMeta, useErrorToast, useToast } from '#imports';
import { defineComponent } from 'vue';
import { LayoutKey } from '~/config/layout';

export default defineComponent({
    components: { AUserAuthenticators, AUserPasswordForm },
    setup() {
        definePageMeta({ [LayoutKey.REQUIRED_LOGGED_IN]: true });

        const toast = useToast();
        const errorToast = useErrorToast();
        const handleFailed = (e: Error) => errorToast.show(e);

        const store = injectStore();
        const { userId } = storeToRefs(store);

        const translationsDefault = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.PASSWORD,
            },
            {
                namespace: TranslatorTranslationNamespace.APP,
                key: TranslatorTranslationAppKey.MFA_SECURITY_TITLE,
            },
            {
                namespace: TranslatorTranslationNamespace.APP,
                key: TranslatorTranslationAppKey.MFA_SECURITY_HINT,
            },
        ]);

        const translate = useTranslator();

        const handleUpdated = async () => {
            if (toast) {
                toast.show({
                    variant: 'success',
                    body: await translate({
                        namespace: TranslatorTranslationNamespace.APP,
                        key: TranslatorTranslationAppKey.ACCOUNT_UPDATED,
                    }),
                });
            }
        };


        return {
            id: userId,
            handleUpdated,
            handleFailed,
            translationsDefault,
        };
    },
});
</script>
<template>
    <div>
        <h6 class="title">
            {{ translationsDefault.password }}
        </h6>
        <AUserPasswordForm
            :id="id"
            @updated="handleUpdated"
            @failed="handleFailed"
        />

        <hr class="my-4">

        <h6 class="title">
            {{ translationsDefault.mfaSecurityTitle }}
        </h6>
        <p class="text-fg-muted mb-3">
            {{ translationsDefault.mfaSecurityHint }}
        </p>
        <AUserAuthenticators
            user-id="@me"
            @failed="handleFailed"
        />
    </div>
</template>
