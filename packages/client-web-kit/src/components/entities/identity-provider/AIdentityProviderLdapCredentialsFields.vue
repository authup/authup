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
import { required } from '@vuelidate/validators';
import type { PropType } from 'vue';
import { defineComponent, reactive } from 'vue';
import { VCFormGroup, VCFormInput } from '@vuecs/forms';
import { IVuelidate } from '@ilingo/vuelidate';
import { onChange, useUpdatedAt } from '../../../composables';

export const AIdentityProviderLdapCredentialsFields = defineComponent({
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
        const form = reactive({ user: '', password: '' });

        const $v = useVuelidate({
            user: { required },
            password: { required },
        }, form, { $registerAs: 'credentials' });

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

export default AIdentityProviderLdapCredentialsFields;
</script>

<template>
    <div>
        <IVuelidate :validation="vuelidate.user">
            <template #default="props">
                <VCFormGroup
                    :validation-messages="props.data"
                    :validation-severity="props.severity"
                >
                    <template #label>
                        User
                    </template>
                    <VCFormInput v-model="vuelidate.user.$model" />
                </VCFormGroup>
            </template>
        </IVuelidate>
        <IVuelidate :validation="vuelidate.password">
            <template #default="props">
                <VCFormGroup
                    :validation-messages="props.data"
                    :validation-severity="props.severity"
                >
                    <template #label>
                        Password
                    </template>
                    <VCFormInput
                        v-model="vuelidate.password.$model"
                        type="password"
                        autocomplete="current-password"
                    />
                </VCFormGroup>
            </template>
        </IVuelidate>
    </div>
</template>
