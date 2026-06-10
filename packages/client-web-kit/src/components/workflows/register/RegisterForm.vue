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
    TranslatorTranslationFieldKey,
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
import ActivateForm from './ActivateForm.vue';

// Permissive client-side shape on purpose — the server's
// RegistrationService runs the authoritative UserValidator (canonical
// name/email rules); the form just gives immediate feedback.
class RegisterValidator extends Container<{
    name: string;
    email: string;
    password: string;
}> {
    protected override initialize() {
        super.initialize();
        this.mount('name', createValidator(z.string().min(3).max(128)));
        this.mount('email', createValidator(z.string().email().max(255)));
        this.mount('password', createValidator(z.string().min(3).max(255)));
    }
}

export default defineComponent({
    components: {
        ActivateForm,
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

        const form = reactive({
            name: '',
            email: '',
            password: '',
        });

        const v = useValidup(new RegisterValidator(), form);

        const translations = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.ACTION,
                key: TranslatorTranslationActionKey.REGISTER,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.NAME,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.EMAIL,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.PASSWORD,
            },
            {
                namespace: TranslatorTranslationNamespace.CLIENT,
                key: TranslatorTranslationClientKey.CREATE_ACCOUNT,
            },
            {
                namespace: TranslatorTranslationNamespace.CLIENT,
                key: TranslatorTranslationClientKey.CHECK_EMAIL_ACTIVATE,
            },
            {
                namespace: TranslatorTranslationNamespace.CLIENT,
                key: TranslatorTranslationClientKey.BACK_TO_LOGIN,
            },
        ]);

        const busy = ref(false);
        const error = ref<string | null>(null);

        // Switches the view to the activation step when the server reports
        // the freshly registered account as inactive (email verification).
        const awaitingActivation = ref(false);

        const submit = async () => {
            if (busy.value) {
                return;
            }

            busy.value = true;
            error.value = null;

            try {
                const response = await apiClient.user.register({
                    name: form.name,
                    email: form.email,
                    password: form.password,
                    ...(props.realmId ? { realm_id: props.realmId } : {}),
                });

                if (response.active) {
                    emit('done', response);
                } else {
                    awaitingActivation.value = true;
                }
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
            awaitingActivation,
            translations,
        };
    },
});
</script>
<template>
    <div>
        <template v-if="awaitingActivation">
            <div class="alert alert-info">
                {{ translations.checkEmailActivate }}
            </div>

            <ActivateForm
                @done="$emit('done')"
            />
        </template>
        <template v-else>
            <div class="text-center">
                <h1 class="font-bold">
                    {{ translations.createAccount }}
                </h1>
            </div>

            <form @submit.prevent="submit">
                <div
                    v-if="error"
                    class="alert alert-danger"
                >
                    {{ error }}
                </div>

                <IFieldValidation
                    v-slot="{ value }"
                    :field="v.fields.name"
                >
                    <VCFormGroup :validation="value">
                        <template #label>
                            {{ translations.name }}
                        </template>
                        <VCFormInput v-model="v.fields.name.$model.value" />
                    </VCFormGroup>
                </IFieldValidation>

                <IFieldValidation
                    v-slot="{ value }"
                    :field="v.fields.email"
                >
                    <VCFormGroup :validation="value">
                        <template #label>
                            {{ translations.email }}
                        </template>
                        <VCFormInput
                            v-model="v.fields.email.$model.value"
                            type="email"
                        />
                    </VCFormGroup>
                </IFieldValidation>

                <IFieldValidation
                    v-slot="{ value }"
                    :field="v.fields.password"
                >
                    <VCFormGroup :validation="value">
                        <template #label>
                            {{ translations.password }}
                        </template>
                        <VCFormInput
                            v-model="v.fields.password.$model.value"
                            type="password"
                        />
                    </VCFormGroup>
                </IFieldValidation>

                <VCButton
                    v-bind="submitButton"
                    :label="translations.register"
                    class="w-full"
                />
            </form>
        </template>

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
