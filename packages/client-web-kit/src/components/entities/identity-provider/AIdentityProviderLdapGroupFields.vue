<!--
  - Copyright (c) 2023-2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import type { IdentityProvider, LdapIdentityProvider } from '@authup/core-kit';
import { assignFormProperties } from '../../../core';
import useVuelidate from '@vuelidate/core';
import type { PropType } from 'vue';
import { defineComponent, reactive } from 'vue';
import { VCFormGroup, VCFormInput } from '@vuecs/forms';
import { IVuelidate } from '@ilingo/vuelidate';
import { onChange, useUpdatedAt } from '../../../composables';

export const AIdentityProviderLdapGroupFields = defineComponent({
    components: {
        IVuelidate, 
        VCFormGroup, 
        VCFormInput, 
    },
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

        const $v = useVuelidate({
            group_filter: {},
            group_base_dn: {},
            group_name_attribute: {},
            group_class: {},
            group_member_attribute: {},
            group_member_user_attribute: {},
        }, form, { $registerAs: 'group' });

        function init() {
            if (!props.entity) return;
            assignFormProperties(form, props.entity);
        }

        const updated = useUpdatedAt(props.entity as IdentityProvider);
        onChange(updated, () => init());
        init();

        return { vuelidate: $v };
    },
});

export default AIdentityProviderLdapGroupFields;
</script>

<template>
    <div>
        <IVuelidate :validation="vuelidate.group_filter">
            <template #default="props">
                <VCFormGroup
                    :validation-messages="props.data"
                    :validation-severity="props.severity"
                >
                    <template #label>
                        Filter
                    </template>
                    <VCFormInput
                        v-model="vuelidate.group_filter.$model"
                        placeholder="(member={{dn}})"
                    />
                </VCFormGroup>
            </template>
        </IVuelidate>
        <IVuelidate :validation="vuelidate.group_base_dn">
            <template #default="props">
                <VCFormGroup
                    :validation-messages="props.data"
                    :validation-severity="props.severity"
                >
                    <template #label>
                        Base DN
                    </template>
                    <VCFormInput v-model="vuelidate.group_base_dn.$model" />
                </VCFormGroup>
            </template>
        </IVuelidate>
        <IVuelidate :validation="vuelidate.group_class">
            <template #default="props">
                <VCFormGroup
                    :validation-messages="props.data"
                    :validation-severity="props.severity"
                >
                    <template #label>
                        Class
                    </template>
                    <VCFormInput v-model="vuelidate.group_class.$model" />
                </VCFormGroup>
            </template>
        </IVuelidate>
        <IVuelidate :validation="vuelidate.group_name_attribute">
            <template #default="props">
                <VCFormGroup
                    :validation-messages="props.data"
                    :validation-severity="props.severity"
                >
                    <template #label>
                        Name Attribute
                    </template>
                    <VCFormInput v-model="vuelidate.group_name_attribute.$model" />
                </VCFormGroup>
            </template>
        </IVuelidate>
        <IVuelidate :validation="vuelidate.group_member_attribute">
            <template #default="props">
                <VCFormGroup
                    :validation-messages="props.data"
                    :validation-severity="props.severity"
                >
                    <template #label>
                        Member Attribute
                    </template>
                    <VCFormInput v-model="vuelidate.group_member_attribute.$model" />
                </VCFormGroup>
            </template>
        </IVuelidate>
        <IVuelidate :validation="vuelidate.group_member_user_attribute">
            <template #default="props">
                <VCFormGroup
                    :validation-messages="props.data"
                    :validation-severity="props.severity"
                >
                    <template #label>
                        Member User Attribute
                    </template>
                    <VCFormInput v-model="vuelidate.group_member_user_attribute.$model" />
                </VCFormGroup>
            </template>
        </IVuelidate>
    </div>
</template>
