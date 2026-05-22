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

export const AIdentityProviderLdapUserFields = defineComponent({
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
            user_filter: '',
            user_base_dn: '',
            user_name_attribute: '',
            user_mail_attribute: '',
            user_display_name_attribute: '',
        });

        const $v = useVuelidate({
            user_filter: {},
            user_base_dn: {},
            user_name_attribute: {},
            user_mail_attribute: {},
            user_display_name_attribute: {},
        }, form, { $registerAs: 'user' });

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

export default AIdentityProviderLdapUserFields;
</script>

<template>
    <div>
        <IVuelidate :validation="vuelidate.user_filter">
            <template #default="props">
                <VCFormGroup
                    :validation-messages="props.data"
                    :validation-severity="props.severity"
                >
                    <template #label>
                        Filter
                    </template>
                    <VCFormInput
                        v-model="vuelidate.user_filter.$model"
                        placeholder="(|({name_attribute}={{input}})({mail_attribute}={{input}}))"
                    />
                </VCFormGroup>
            </template>
        </IVuelidate>
        <IVuelidate :validation="vuelidate.user_base_dn">
            <template #default="props">
                <VCFormGroup
                    :validation-messages="props.data"
                    :validation-severity="props.severity"
                >
                    <template #label>
                        Base DN
                    </template>
                    <VCFormInput v-model="vuelidate.user_base_dn.$model" />
                </VCFormGroup>
            </template>
        </IVuelidate>
        <IVuelidate :validation="vuelidate.user_name_attribute">
            <template #default="props">
                <VCFormGroup
                    :validation-messages="props.data"
                    :validation-severity="props.severity"
                >
                    <template #label>
                        Name Attribute
                    </template>
                    <VCFormInput v-model="vuelidate.user_name_attribute.$model" />
                </VCFormGroup>
            </template>
        </IVuelidate>
        <IVuelidate :validation="vuelidate.user_mail_attribute">
            <template #default="props">
                <VCFormGroup
                    :validation-messages="props.data"
                    :validation-severity="props.severity"
                >
                    <template #label>
                        Mail Attribute
                    </template>
                    <VCFormInput v-model="vuelidate.user_mail_attribute.$model" />
                </VCFormGroup>
            </template>
        </IVuelidate>
        <IVuelidate :validation="vuelidate.user_display_name_attribute">
            <template #default="props">
                <VCFormGroup
                    :validation-messages="props.data"
                    :validation-severity="props.severity"
                >
                    <template #label>
                        DisplayName Attribute
                    </template>
                    <VCFormInput v-model="vuelidate.user_display_name_attribute.$model" />
                </VCFormGroup>
            </template>
        </IVuelidate>
    </div>
</template>
