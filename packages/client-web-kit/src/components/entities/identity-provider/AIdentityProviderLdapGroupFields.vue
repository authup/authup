<!--
  - Copyright (c) 2023-2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import type { IdentityProvider, LdapIdentityProvider } from '@authup/core-kit';
import { assignFormProperties, useFieldValidation  } from '../../../core';
import { Container } from 'validup';
import { useValidup } from '@validup/vue';
import type { PropType } from 'vue';
import { defineComponent, reactive } from 'vue';
import { VCFormGroup, VCFormInput } from '@vuecs/forms';
import { onChange, useUpdatedAt } from '../../../composables';

export const AIdentityProviderLdapGroupFields = defineComponent({
    components: { VCFormGroup, VCFormInput },
    props: {
        entity: { type: Object as PropType<Partial<LdapIdentityProvider>> },
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
            assignFormProperties(form, props.entity);
        }

        const updated = useUpdatedAt(props.entity as IdentityProvider);
        onChange(updated, () => init());
        init();

        return { v, useFieldValidation };
    },
});

export default AIdentityProviderLdapGroupFields;
</script>

<template>
    <div>
        <VCFormGroup :validation="useFieldValidation(v.fields.group_filter)">
            <template #label>
                Filter
            </template>
            <VCFormInput
                v-model="v.fields.group_filter.$model.value"
                placeholder="(member={{dn}})"
            />
        </VCFormGroup>
        <VCFormGroup :validation="useFieldValidation(v.fields.group_base_dn)">
            <template #label>
                Base DN
            </template>
            <VCFormInput v-model="v.fields.group_base_dn.$model.value" />
        </VCFormGroup>
        <VCFormGroup :validation="useFieldValidation(v.fields.group_class)">
            <template #label>
                Class
            </template>
            <VCFormInput v-model="v.fields.group_class.$model.value" />
        </VCFormGroup>
        <VCFormGroup :validation="useFieldValidation(v.fields.group_name_attribute)">
            <template #label>
                Name Attribute
            </template>
            <VCFormInput v-model="v.fields.group_name_attribute.$model.value" />
        </VCFormGroup>
        <VCFormGroup :validation="useFieldValidation(v.fields.group_member_attribute)">
            <template #label>
                Member Attribute
            </template>
            <VCFormInput v-model="v.fields.group_member_attribute.$model.value" />
        </VCFormGroup>
        <VCFormGroup :validation="useFieldValidation(v.fields.group_member_user_attribute)">
            <template #label>
                Member User Attribute
            </template>
            <VCFormInput v-model="v.fields.group_member_user_attribute.$model.value" />
        </VCFormGroup>
    </div>
</template>
