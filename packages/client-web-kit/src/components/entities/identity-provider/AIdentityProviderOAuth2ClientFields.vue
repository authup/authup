<!--
  - Copyright (c) 2023-2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import type { IdentityProvider, OAuth2IdentityProvider } from '@authup/core-kit';
import { TranslatorTranslationFieldKey, TranslatorTranslationNamespace } from '@authup/i18n';
import { assignFormProperties, useTranslations } from '../../../core';
import { Container } from 'validup';
import { useValidup } from '@validup/vue';
import type { PropType } from 'vue';
import { defineComponent, reactive, ref } from 'vue';
import { VCFormGroup, VCFormInput } from '@vuecs/forms';
import { VCButton } from '@vuecs/button';
import { onChange, useUpdatedAt } from '../../../composables';
import { IFieldValidation } from '@ilingo/validup-vue';

export default defineComponent({
    components: {
        VCFormGroup,
        VCFormInput,
        VCButton,
        IFieldValidation,
    },
    props: { entity: { type: Object as PropType<Partial<IdentityProvider>> } },
    emits: ['updated'],
    setup(props) {
        const form = reactive({ client_id: '', client_secret: '' });

        const secretShow = ref(false);

        const v = useValidup(new Container<typeof form>(), form, { name: 'client' });

        function assign() {
            assignFormProperties(form, props.entity as Partial<OAuth2IdentityProvider>);
        }

        const updatedAt = useUpdatedAt(props.entity as IdentityProvider);
        onChange(updatedAt, () => assign());
        assign();

        const translations = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.CLIENT_ID,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.CLIENT_SECRET,
            },
        ]);

        return {
            v, 
            secretShow, 
            translations, 
        };
    },
});

</script>

<template>
    <div>
        <IFieldValidation
            v-slot="{ value }"
            :field="v.fields.client_id"
        >
            <VCFormGroup :validation="value">
                <template #label>
                    {{ translations.clientId }}
                </template>
                <VCFormInput v-model="v.fields.client_id.$model.value" />
            </VCFormGroup>
        </IFieldValidation>
        <IFieldValidation
            v-slot="{ value }"
            :field="v.fields.client_secret"
        >
            <VCFormGroup :validation="value">
                <template #label>
                    {{ translations.clientSecret }}
                </template>
                <VCFormInput
                    v-model="v.fields.client_secret.$model.value"
                    :type="secretShow ? 'text' : 'password'"
                    autocomplete="new-password"
                >
                    <template #groupAppend>
                        <VCButton
                            type="button"
                            @click.prevent="secretShow = !secretShow"
                        >
                            <VCIcon :name="secretShow ? 'fa6-solid:eye-slash' : 'fa6-solid:eye'" />
                        </VCButton>
                    </template>
                </VCFormInput>
            </VCFormGroup>
        </IFieldValidation>
    </div>
</template>
