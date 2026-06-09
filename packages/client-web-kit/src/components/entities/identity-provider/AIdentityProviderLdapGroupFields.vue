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
            group_filter: '',
            group_base_dn: '',
            group_name_attribute: '',
            group_class: '',
            group_member_attribute: '',
            group_member_user_attribute: '',
        });

        const v = useValidup(new Container<typeof form>(), form, { name: 'group' });

        function init() {
            if (!props.entity) return;
            assignFormProperties(form, props.entity as Partial<LdapIdentityProvider>);
        }

        const updated = useUpdatedAt(props.entity as IdentityProvider);
        onChange(updated, () => init());
        init();

        return { v };
    },
});

</script>

<template>
    <div>
        <IFieldValidation
            v-slot="{ value }"
            :field="v.fields.group_filter"
        >
            <VCFormGroup :validation="value">
                <template #label>
                    Filter
                </template>
                <VCFormInput
                    v-model="v.fields.group_filter.$model.value"
                    placeholder="(member={{dn}})"
                />
            </VCFormGroup>
        </IFieldValidation>
        <IFieldValidation
            v-slot="{ value }"
            :field="v.fields.group_base_dn"
        >
            <VCFormGroup :validation="value">
                <template #label>
                    Base DN
                </template>
                <VCFormInput v-model="v.fields.group_base_dn.$model.value" />
            </VCFormGroup>
        </IFieldValidation>
        <IFieldValidation
            v-slot="{ value }"
            :field="v.fields.group_class"
        >
            <VCFormGroup :validation="value">
                <template #label>
                    Class
                </template>
                <VCFormInput v-model="v.fields.group_class.$model.value" />
            </VCFormGroup>
        </IFieldValidation>
        <IFieldValidation
            v-slot="{ value }"
            :field="v.fields.group_name_attribute"
        >
            <VCFormGroup :validation="value">
                <template #label>
                    Name Attribute
                </template>
                <VCFormInput v-model="v.fields.group_name_attribute.$model.value" />
            </VCFormGroup>
        </IFieldValidation>
        <IFieldValidation
            v-slot="{ value }"
            :field="v.fields.group_member_attribute"
        >
            <VCFormGroup :validation="value">
                <template #label>
                    Member Attribute
                </template>
                <VCFormInput v-model="v.fields.group_member_attribute.$model.value" />
            </VCFormGroup>
        </IFieldValidation>
        <IFieldValidation
            v-slot="{ value }"
            :field="v.fields.group_member_user_attribute"
        >
            <VCFormGroup :validation="value">
                <template #label>
                    Member User Attribute
                </template>
                <VCFormInput v-model="v.fields.group_member_user_attribute.$model.value" />
            </VCFormGroup>
        </IFieldValidation>
    </div>
</template>
