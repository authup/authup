<!--
  - Copyright (c) 2023-2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import type { IdentityProvider, LdapIdentityProvider } from '@authup/core-kit';
import {
    TranslatorTranslationClientKey,
    TranslatorTranslationFieldKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import { assignFormProperties, useTranslations } from '../../../core';
import { Container } from 'validup';
import { useValidup } from '@validup/vue';
import type { PropType } from 'vue';
import { defineComponent, reactive } from 'vue';
import { VCFormGroup, VCFormInput, VCFormSwitch } from '@vuecs/forms';
import { onChange, useUpdatedAt } from '../../../composables';
import { IFieldValidation } from '@ilingo/validup-vue';

export default defineComponent({
    components: {
        VCFormGroup, 
        VCFormInput, 
        VCFormSwitch,

        IFieldValidation,
    },
    props: {
        entity: { type: Object as PropType<Partial<IdentityProvider>> },
        discovery: {
            type: Boolean,
            default: false,
        },
    },
    emits: ['updated'],
    setup(props) {
        const form = reactive({
            url: '',
            timeout: 0,
            startTls: true,
            baseDn: '',
        });

        const v = useValidup(new Container<typeof form>(), form, { name: 'connection' });

        function init() {
            if (!props.entity) return;
            assignFormProperties(form, props.entity as Partial<LdapIdentityProvider>, { fields: v.fields });
        }

        const updated = useUpdatedAt(() => props.entity as IdentityProvider);
        onChange(updated, () => init());

        init();

        const onTimeoutChange = (input: string) => {
            if (input.trim() === '') {
                v.fields.timeout.$model.value = 0;
                return;
            }
            const intValue = Number.parseInt(input, 10);
            v.fields.timeout.$model.value = Number.isNaN(intValue) ? 0 : intValue;
        };

        const translations = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.URL,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.TIMEOUT,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.START_TLS,
            },
            {
                namespace: TranslatorTranslationNamespace.CLIENT,
                key: TranslatorTranslationClientKey.ENABLE_STARTTLS_HINT,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.BASE_DN,
            },
        ]);

        return {
            v,
            translations,
            onTimeoutChange,
        };
    },
});

</script>

<template>
    <div>
        <IFieldValidation
            v-slot="{ value }"
            :field="v.fields.url"
        >
            <VCFormGroup :validation="value">
                <template #label>
                    {{ translations.url }}
                </template>
                <VCFormInput
                    v-model="v.fields.url.$model.value"
                    placeholder="<scheme>://<address>:<port>"
                />
            </VCFormGroup>
        </IFieldValidation>

        <IFieldValidation
            v-slot="{ value }"
            :field="v.fields.timeout"
        >
            <VCFormGroup :validation="value">
                <template #label>
                    {{ translations.timeout }}
                </template>
                <VCFormInput
                    :model-value="String(v.fields.timeout.$model.value)"
                    type="number"
                    @update:model-value="onTimeoutChange"
                />
            </VCFormGroup>
        </IFieldValidation>

        <IFieldValidation
            v-slot="{ value }"
            :field="v.fields.startTls"
        >
            <VCFormGroup :validation="value">
                <template #label>
                    {{ translations.startTls }}
                </template>
                <VCFormSwitch
                    v-model="v.fields.startTls.$model.value"
                    :label="true"
                    :label-content="translations.enableStartTlsHint"
                />
            </VCFormGroup>
        </IFieldValidation>

        <IFieldValidation
            v-slot="{ value }"
            :field="v.fields.baseDn"
        >
            <VCFormGroup :validation="value">
                <template #label>
                    {{ translations.baseDn }}
                </template>
                <VCFormInput
                    v-model="v.fields.baseDn.$model.value"
                    placeholder="e.g. dc=example,dc=com"
                />
            </VCFormGroup>
        </IFieldValidation>
    </div>
</template>
