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
    watch,
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
import { VCAlert } from '@vuecs/elements';
import { VCFormGroup, VCFormInput, useSubmitButton } from '@vuecs/forms';
import { IFieldValidation } from '@ilingo/validup-vue';
import { injectHTTPClient, useTranslations, wrapFnWithBusyState } from '../../../core';

class ActivateValidator extends Container<{ token: string }> {
    protected override initialize() {
        super.initialize();
        this.mount('token', createValidator(z.string().min(3).max(256)));
    }
}

export default defineComponent({
    components: {
        VCButton,
        VCAlert,
        VCFormGroup,
        VCFormInput,
        IFieldValidation,
    },
    props: {
        token: {
            type: String,
            default: '',
        },
    },
    emits: ['done', 'failed'],
    setup(props, { emit }) {
        const apiClient = injectHTTPClient();

        const form = reactive({ token: props.token });

        // Keep the field in sync if the component is reused with a new token.
        watch(() => props.token, (value) => {
            form.token = value;
        });

        const v = useValidup(new ActivateValidator(), form);

        const translations = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.ACTION,
                key: TranslatorTranslationActionKey.ACTIVATE,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.CODE,
            },
            {
                namespace: TranslatorTranslationNamespace.CLIENT,
                key: TranslatorTranslationClientKey.ACTIVATE_ACCOUNT,
            },
            {
                namespace: TranslatorTranslationNamespace.CLIENT,
                key: TranslatorTranslationClientKey.ACCOUNT_ACTIVATED,
            },
        ]);

        const busy = ref(false);
        const error = ref<string | null>(null);
        const finished = ref(false);

        const submit = wrapFnWithBusyState(busy, async () => {
            error.value = null;

            try {
                await apiClient.user.activate(form.token);

                finished.value = true;
                emit('done');
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
                {{ translations.activateAccount }}
            </h1>
        </div>

        <VCAlert
            v-if="finished"
            color="success"
            variant="soft"
            class="mb-3"
        >
            {{ translations.accountActivated }}
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
                :field="v.fields.token"
            >
                <VCFormGroup :validation="value">
                    <template #label>
                        {{ translations.code }}
                    </template>
                    <VCFormInput v-model="v.fields.token.$model.value" />
                </VCFormGroup>
            </IFieldValidation>

            <VCButton
                v-bind="submitButton"
                :label="translations.activate"
                class="w-full"
            />
        </form>
    </div>
</template>
