<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
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
import { IFieldValidation } from '@ilingo/validup-vue';
import { injectHTTPClient, useTranslations } from '../../../core';

class PasswordResetValidator extends Container<{
    identifier: string;
    token: string;
    password: string;
}> {
    protected override initialize() {
        super.initialize();
        this.mount('identifier', createValidator(z.string().min(3).max(255)));
        this.mount('token', createValidator(z.string().min(3).max(256)));
        this.mount('password', createValidator(z.string().min(3).max(255)));
    }
}

export default defineComponent({
    components: {
        VCButton,
        VCFormGroup,
        VCFormInput,
        IFieldValidation,
    },
    props: {
        realmId: { type: String },
        token: {
            type: String,
            default: '',
        },
    },
    emits: ['done', 'failed'],
    setup(props, { emit }) {
        const apiClient = injectHTTPClient();

        const form = reactive({
            identifier: '',
            token: props.token,
            password: '',
        });

        const v = useValidup(new PasswordResetValidator(), form);

        const translations = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.ACTION,
                key: TranslatorTranslationActionKey.RESET,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.CODE,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.PASSWORD,
            },
            {
                namespace: TranslatorTranslationNamespace.CLIENT,
                key: TranslatorTranslationClientKey.RESET_PASSWORD,
            },
            {
                namespace: TranslatorTranslationNamespace.CLIENT,
                key: TranslatorTranslationClientKey.EMAIL_OR_NAME,
            },
            {
                namespace: TranslatorTranslationNamespace.CLIENT,
                key: TranslatorTranslationClientKey.PASSWORD_RESET_DONE,
            },
        ]);

        const busy = ref(false);
        const error = ref<string | null>(null);
        const finished = ref(false);

        const submit = async () => {
            if (busy.value) {
                return;
            }

            busy.value = true;
            error.value = null;

            try {
                const identifier = form.identifier.trim();
                const response = await apiClient.user.passwordReset({
                    ...(identifier.includes('@') ? { email: identifier } : { name: identifier }),
                    token: form.token,
                    password: form.password,
                    ...(props.realmId ? { realm_id: props.realmId } : {}),
                });

                finished.value = true;
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
            finished,
            translations,
        };
    },
});
</script>
<template>
    <div>
        <div class="text-center">
            <h1 class="font-bold">
                {{ translations.resetPassword }}
            </h1>
        </div>

        <div
            v-if="finished"
            class="alert alert-success"
        >
            {{ translations.passwordResetDone }}
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

            <IFieldValidation
                v-slot="{ value }"
                :field="v.fields.token"
            >
                <VCFormGroup :validation="value">
                    <template #label>
                        {{ translations.code }}
                    </template>
                    <VCFormInput v-model="v.fields.token.$model.value" />
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
                :label="translations.reset"
                class="w-full"
            />
        </form>
    </div>
</template>
