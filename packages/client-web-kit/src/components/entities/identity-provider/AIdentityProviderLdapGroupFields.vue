<!--
  - Copyright (c) 2023-2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import type { IdentityProvider, LdapIdentityProvider } from '@authup/core-kit';
import { TranslatorTranslationFieldKey, TranslatorTranslationNamespace } from '@authup/i18n';
import { assignFormProperties, useTranslations } from '../../../core';
import { Container } from 'validup';
import { useValidup } from '@validup/vue';
import type { PropType } from 'vue';
import { defineComponent, reactive } from 'vue';
import { VCFormGroup, VCFormInput } from '@vuecs/forms';
import { onChange, useUpdatedAt } from '../../../composables';
import { IFieldValidation } from '@ilingo/validup-vue';

export default defineComponent({
    components: {
        VCFormGroup, 
        VCFormInput, 
        IFieldValidation, 
    },
    props: {
        entity: { type: Object as PropType<Partial<IdentityProvider>> },
        discovery: { type: Boolean, default: false },
    },
    emits: ['updated'],
    setup(props) {
        const form = reactive({
            groupFilter: '',
            groupBaseDn: '',
            groupNameAttribute: '',
            groupClass: '',
            groupMemberAttribute: '',
            groupMemberUserAttribute: '',
        });

        const v = useValidup(new Container<typeof form>(), form, { name: 'group' });

        function init() {
            if (!props.entity) return;
            assignFormProperties(form, props.entity as Partial<LdapIdentityProvider>, { fields: v.fields });
        }

        const updated = useUpdatedAt(() => props.entity as IdentityProvider);
        onChange(updated, () => init());
        init();

        const translations = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.FILTER,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.BASE_DN,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.CLASS,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.NAME_ATTRIBUTE,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.MEMBER_ATTRIBUTE,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.MEMBER_USER_ATTRIBUTE,
            },
        ]);

        return { v, translations };
    },
});

</script>

<template>
    <div>
        <IFieldValidation
            v-slot="{ value }"
            :field="v.fields.groupFilter"
        >
            <VCFormGroup :validation="value">
                <template #label>
                    {{ translations.filter }}
                </template>
                <VCFormInput
                    v-model="v.fields.groupFilter.$model.value"
                    placeholder="(member={{dn}})"
                />
            </VCFormGroup>
        </IFieldValidation>
        <IFieldValidation
            v-slot="{ value }"
            :field="v.fields.groupBaseDn"
        >
            <VCFormGroup :validation="value">
                <template #label>
                    {{ translations.baseDn }}
                </template>
                <VCFormInput v-model="v.fields.groupBaseDn.$model.value" />
            </VCFormGroup>
        </IFieldValidation>
        <IFieldValidation
            v-slot="{ value }"
            :field="v.fields.groupClass"
        >
            <VCFormGroup :validation="value">
                <template #label>
                    {{ translations.class }}
                </template>
                <VCFormInput v-model="v.fields.groupClass.$model.value" />
            </VCFormGroup>
        </IFieldValidation>
        <IFieldValidation
            v-slot="{ value }"
            :field="v.fields.groupNameAttribute"
        >
            <VCFormGroup :validation="value">
                <template #label>
                    {{ translations.nameAttribute }}
                </template>
                <VCFormInput v-model="v.fields.groupNameAttribute.$model.value" />
            </VCFormGroup>
        </IFieldValidation>
        <IFieldValidation
            v-slot="{ value }"
            :field="v.fields.groupMemberAttribute"
        >
            <VCFormGroup :validation="value">
                <template #label>
                    {{ translations.memberAttribute }}
                </template>
                <VCFormInput v-model="v.fields.groupMemberAttribute.$model.value" />
            </VCFormGroup>
        </IFieldValidation>
        <IFieldValidation
            v-slot="{ value }"
            :field="v.fields.groupMemberUserAttribute"
        >
            <VCFormGroup :validation="value">
                <template #label>
                    {{ translations.memberUserAttribute }}
                </template>
                <VCFormInput v-model="v.fields.groupMemberUserAttribute.$model.value" />
            </VCFormGroup>
        </IFieldValidation>
    </div>
</template>
