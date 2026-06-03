<!--
  - Copyright (c) 2023-2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import type { IdentityProvider, OAuth2IdentityProvider } from '@authup/core-kit';
import { assignFormProperties } from '../../../core';
import { Container } from 'validup';
import { useValidup } from '@validup/vue';
import type { PropType } from 'vue';
import { defineComponent, reactive } from 'vue';
import { VCFormGroup, VCFormInput } from '@vuecs/forms';
import { onChange, useUpdatedAt } from '../../../composables';
import { IFieldValidation } from '@ilingo/validup-vue';

export const AIdentityProviderOAuth2ClientFields = defineComponent({
    components: {
        VCFormGroup, 
        VCFormInput, 
        IFieldValidation, 
    },
    props: { entity: { type: Object as PropType<Partial<OAuth2IdentityProvider>> } },
    emits: ['updated'],
    setup(props) {
        const form = reactive({ client_id: '', client_secret: '' });

        const v = useValidup(new Container<typeof form>(), form, { name: 'client' });

        function assign() {
            assignFormProperties(form, props.entity);
        }

        const updatedAt = useUpdatedAt(props.entity as IdentityProvider);
        onChange(updatedAt, () => assign());
        assign();

        return { v };
    },
});

export default AIdentityProviderOAuth2ClientFields;
</script>

<template>
    <div>
        <IFieldValidation
            v-slot="{ value }"
            :field="v.fields.client_id"
        >
            <VCFormGroup :validation="value">
                <template #label>
                    Client ID
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
                    Client Secret
                </template>
                <VCFormInput
                    v-model="v.fields.client_secret.$model.value"
                    type="password"
                    autocomplete="new-password"
                />
            </VCFormGroup>
        </IFieldValidation>
    </div>
</template>
