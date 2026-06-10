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
import { VCFormGroup, VCFormInput, useSubmitButton } from '@vuecs/forms';
import type { LinkProperties } from '@vuecs/link';
import { VCLink } from '@vuecs/link';
import { IFieldValidation } from '@ilingo/validup-vue';
import { injectHTTPClient, useTranslations } from '../../../core';

class PasswordForgotValidator extends Container<{ identifier: string }> {
    protected override initialize() {
        super.initialize();
        this.mount('identifier', createValidator(z.string().min(3).max(255)));
    }
}

export default defineComponent({
    components: {
        VCButton,
        VCFormGroup,
        VCFormInput,
        VCLink,
        IFieldValidation,
    },
    props: {
        realmId: { type: String },
        backLink: { type: Object as PropType<LinkProperties> },
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

        const submit = async () => {
            if (busy.value) {
                return;
            }

            busy.value = true;
            error.value = null;

            try {
                const identifier = form.identifier.trim();
                const response = await apiClient.user.passwordForgot({
                    ...(identifier.includes('@') ? { email: identifier } : { name: identifier }),
                    ...(props.realmId ? { realm_id: props.realmId } : {}),
                });

                sent.value = true;
                emit('done', response);
            } catch (e) {
                error.value = e instanceof Error ? e.message : null;
                emit('failed', e);
            } finally {
                busy.value = false;
            }
        };

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

        <div
            v-if="sent"
            class="alert alert-info"
        >
            {{ translations.checkEmailReset }}
        </div>
        <form
            v-else
            @submit.prevent="submit"
        >
            <div
                v-if="error"
                class="alert alert-danger"
            >
                {{ error }}
            </div>

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

        <div
            v-if="backLink"
            class="text-center mt-3"
        >
            <VCLink
                v-bind="backLink"
                class="auth-form-back"
            >
                <VCIcon name="fa6-solid:chevron-left" />
                {{ translations.backToLogin }}
            </VCLink>
        </div>
    </div>
</template>
<style scoped>
.auth-form-back {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.85em;
    color: var(--vc-color-fg-muted);
}

.auth-form-back:hover {
    color: var(--vc-color-fg);
}
</style>
