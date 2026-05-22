<!--
  - Copyright (c) 2023-2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import type { IdentityProvider, OAuth2IdentityProvider } from '@authup/core-kit';
import { assignFormProperties } from '../../../core';
import useVuelidate from '@vuelidate/core';
import { maxLength, minLength, required } from '@vuelidate/validators';
import type { PropType } from 'vue';
import { defineComponent, reactive } from 'vue';
import { VCFormGroup, VCFormInput } from '@vuecs/forms';
import { IVuelidate } from '@ilingo/vuelidate';
import { onChange, useUpdatedAt } from '../../../composables';

export const AIdentityProviderOAuth2ClientFields = defineComponent({
    components: {
        IVuelidate, 
        VCFormGroup, 
        VCFormInput, 
    },
    props: { entity: { type: Object as PropType<Partial<OAuth2IdentityProvider>> } },
    emits: ['updated'],
    setup(props) {
        const form = reactive({ client_id: '', client_secret: '' });

        const $v = useVuelidate({
            client_id: {
                required,
                minLength: minLength(3),
                maxLength: maxLength(128),
            },
            client_secret: {
                minLength: minLength(3),
                maxLength: maxLength(128),
            },
        }, form, { $registerAs: 'client' });

        function assign() {
            assignFormProperties(form, props.entity);
        }

        const updatedAt = useUpdatedAt(props.entity as IdentityProvider);
        onChange(updatedAt, () => assign());
        assign();

        return { vuelidate: $v };
    },
});

export default AIdentityProviderOAuth2ClientFields;
</script>

<template>
    <div>
        <IVuelidate :validation="vuelidate.client_id">
            <template #default="props">
                <VCFormGroup
                    :validation-messages="props.data"
                    :validation-severity="props.severity"
                >
                    <template #label>
                        Client ID
                    </template>
                    <VCFormInput v-model="vuelidate.client_id.$model" />
                </VCFormGroup>
            </template>
        </IVuelidate>
        <IVuelidate :validation="vuelidate.client_secret">
            <template #default="props">
                <VCFormGroup
                    :validation-messages="props.data"
                    :validation-severity="props.severity"
                >
                    <template #label>
                        Client Secret
                    </template>
                    <VCFormInput v-model="vuelidate.client_secret.$model" />
                </VCFormGroup>
            </template>
        </IVuelidate>
    </div>
</template>
