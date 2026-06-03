<!--
  - Copyright (c) 2023-2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import type { IdentityProvider, LdapIdentityProvider } from '@authup/core-kit';
import { assignFormProperties } from '../../../core';
import { Container } from 'validup';
import { useValidup } from '@validup/vue';
import type { PropType } from 'vue';
import { defineComponent, reactive } from 'vue';
import { VCFormGroup, VCFormInput } from '@vuecs/forms';
import { onChange, useUpdatedAt } from '../../../composables';
import { IFieldValidation } from '@ilingo/validup-vue';

export const AIdentityProviderLdapUserFields = defineComponent({
    components: {
        VCFormGroup, 
        VCFormInput, 
        IFieldValidation, 
    },
    props: {
        entity: { type: Object as PropType<Partial<LdapIdentityProvider>> },
        discovery: { type: Boolean, default: false },
    },
    emits: ['updated'],
    setup(props) {
        const form = reactive({
            user_filter: '',
            user_base_dn: '',
            user_name_attribute: '',
            user_mail_attribute: '',
            user_display_name_attribute: '',
        });

        const v = useValidup(new Container<typeof form>(), form, { name: 'user' });

        function init() {
            if (!props.entity) return;
            assignFormProperties(form, props.entity);
        }

        const updated = useUpdatedAt(props.entity as IdentityProvider);
        onChange(updated, () => init());
        init();

        return { v };
    },
});

export default AIdentityProviderLdapUserFields;
</script>

<template>
    <div>
        <IFieldValidation
            v-slot="{ value }"
            :field="v.fields.user_filter"
        >
            <VCFormGroup :validation="value">
                <template #label>
                    Filter
                </template>
                <VCFormInput
                    v-model="v.fields.user_filter.$model.value"
                    placeholder="(|({name_attribute}={{input}})({mail_attribute}={{input}}))"
                />
            </VCFormGroup>
        </IFieldValidation>
        <IFieldValidation
            v-slot="{ value }"
            :field="v.fields.user_base_dn"
        >
            <VCFormGroup :validation="value">
                <template #label>
                    Base DN
                </template>
                <VCFormInput v-model="v.fields.user_base_dn.$model.value" />
            </VCFormGroup>
        </IFieldValidation>
        <IFieldValidation
            v-slot="{ value }"
            :field="v.fields.user_name_attribute"
        >
            <VCFormGroup :validation="value">
                <template #label>
                    Name Attribute
                </template>
                <VCFormInput v-model="v.fields.user_name_attribute.$model.value" />
            </VCFormGroup>
        </IFieldValidation>
        <IFieldValidation
            v-slot="{ value }"
            :field="v.fields.user_mail_attribute"
        >
            <VCFormGroup :validation="value">
                <template #label>
                    Mail Attribute
                </template>
                <VCFormInput v-model="v.fields.user_mail_attribute.$model.value" />
            </VCFormGroup>
        </IFieldValidation>
        <IFieldValidation
            v-slot="{ value }"
            :field="v.fields.user_display_name_attribute"
        >
            <VCFormGroup :validation="value">
                <template #label>
                    DisplayName Attribute
                </template>
                <VCFormInput v-model="v.fields.user_display_name_attribute.$model.value" />
            </VCFormGroup>
        </IFieldValidation>
    </div>
</template>
