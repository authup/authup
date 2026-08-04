<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import type { PropType } from 'vue';
import {
    computed,
    defineComponent,
    reactive,
    ref,
} from 'vue';
import { useValidup } from '@validup/vue';
import {
    TranslatorTranslationActionKey,
    TranslatorTranslationClientKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import { createValidator } from '@validup/zod';
import { Container } from 'validup';
import { z } from 'zod';
import { VCButton } from '@vuecs/button';
import { VCAlert } from '@vuecs/elements';
import { VCFormGroup, VCFormInput, useSubmitButton } from '@vuecs/forms';
import type { LinkProps } from '@vuecs/link';
import { IFieldValidation } from '@ilingo/validup-vue';
import { injectHTTPClient, useTranslations, wrapFnWithBusyState } from '../../../core';
import { AAuthBackLink } from '../../utility';

class PasswordForgotValidator extends Container<{ identifier: string }> {
    protected override initialize() {
        super.initialize();
        this.mount('identifier', createValidator(z.string().min(3).max(255)));
    }
}

export default defineComponent({
    components: {
        AAuthBackLink,
        VCButton,
        VCAlert,
        VCFormGroup,
        VCFormInput,
        IFieldValidation,
    },
    props: {
        realmId: { type: String },
        backLink: { type: Object as PropType<LinkProps> },
    },
    emits: ['done', 'failed'],
    setup(props, { emit }) {
        const apiClient = injectHTTPClient();

        const form = reactive({ identifier: '' });

        const v = useValidup(new PasswordForgotValidator(), form);

        const translations = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.ACTION,
                key: TranslatorTranslationActionKey.SEND,
            },
            {
                namespace: TranslatorTranslationNamespace.CLIENT,
                key: TranslatorTranslationClientKey.FORGOT_PASSWORD,
            },
            {
                namespace: TranslatorTranslationNamespace.CLIENT,
                key: TranslatorTranslationClientKey.EMAIL_OR_NAME,
            },
            {
                namespace: TranslatorTranslationNamespace.CLIENT,
                key: TranslatorTranslationClientKey.CHECK_EMAIL_RESET,
            },
            {
                namespace: TranslatorTranslationNamespace.CLIENT,
                key: TranslatorTranslationClientKey.BACK_TO_LOGIN,
            },
        ]);

        const busy = ref(false);
        const error = ref<string | null>(null);
        const sent = ref(false);

        const submit = wrapFnWithBusyState(busy, async () => {
            error.value = null;

            try {
                const identifier = form.identifier.trim();
                const response = await apiClient.user.passwordForgot({
                    ...(identifier.includes('@') ? { email: identifier } : { name: identifier }),
                    ...(props.realmId ? { realmId: props.realmId } : {}),
                });

                sent.value = true;
                emit('done', response);
            } catch (e) {
                error.value = e instanceof Error ? e.message : null;
                emit('failed', e);
            }
        });

        const submitButton = useSubmitButton({
            loading: busy,
            disabled: computed(() => busy.value || v.$invalid.value),
        });

        return {
            v,
            form,
            submit,
            submitButton,
            busy,
            error,
            sent,
            translations,
        };
    },
});
</script>
<template>
    <div>
        <div class="text-center">
            <h1 class="font-bold">
                {{ translations.forgotPassword }}
            </h1>
        </div>

        <VCAlert
            v-if="sent"
            color="info"
            variant="soft"
            class="mb-3"
        >
            {{ translations.checkEmailReset }}
        </VCAlert>
        <form
            v-else
            @submit.prevent="submit"
        >
            <VCAlert
                v-if="error"
                color="error"
                variant="soft"
                class="mb-3"
            >
                {{ error }}
            </VCAlert>

            <IFieldValidation
                v-slot="{ value }"
                :field="v.fields.identifier"
            >
                <VCFormGroup :validation="value">
                    <template #label>
                        {{ translations.emailOrName }}
                    </template>
                    <VCFormInput v-model="v.fields.identifier.$model.value" />
                </VCFormGroup>
            </IFieldValidation>

            <VCButton
                v-bind="submitButton"
                :label="translations.send"
                class="w-full"
            />
        </form>

        <AAuthBackLink :link="backLink" />
    </div>
</template>
