<!--
  Copyright (c) 2023.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
-->

<script lang="ts">
import type { IdentityProvider, OAuth2IdentityProvider } from '@authup/core-kit';
import type { OpenIDProviderMetadata } from '@authup/specs';
import { VCFormGroup, VCFormInput } from '@vuecs/form-controls';
import useVuelidate from '@vuelidate/core';
import { required, url } from '@vuelidate/validators';
import type { PropType } from 'vue';
import { defineComponent, reactive } from 'vue';
import { onChange, useUpdatedAt } from '../../../composables';
import { assignFormProperties, getVuelidateSeverity, useTranslationsForNestedValidation } from '../../../core';
import { AIdentityProviderOAuth2Discovery } from './AIdentityProviderOAuth2Discovery';

export default defineComponent({
    components: {
        VCFormGroup, 
        VCFormInput, 
        AIdentityProviderOAuth2Discovery, 
    },
    props: {
        entity: { type: Object as PropType<Partial<OAuth2IdentityProvider>> },
        discovery: {
            type: Boolean,
            default: false,
        },
    },
    emits: ['updated'],
    setup(props) {
        const form = reactive({
            token_url: '',
            authorize_url: '',
            user_info_url: '',
        });

        const $v = useVuelidate({
            token_url: {
                required,
                url,
            },
            authorize_url: {
                required,
                url,
            },
            user_info_url: { url },
        }, form, { $registerAs: 'endpoint' });

        function init() {
            if (!props.entity) return;

            assignFormProperties(form, props.entity);
        }

        const updated = useUpdatedAt(props.entity as IdentityProvider);
        onChange(updated, () => init());

        init();

        const validationMessages = useTranslationsForNestedValidation($v.value);

        const handleDiscoveryLookup = (data: OpenIDProviderMetadata) => {
            form.authorize_url = data.authorization_endpoint;
            form.token_url = data.token_endpoint;
        };

        return {
            $v,
            validationMessages,
            handleDiscoveryLookup,
            getVuelidateSeverity,
        };
    },
});
</script>
<template>
    <AIdentityProviderOAuth2Discovery
        v-if="discovery"
        @lookup="handleDiscoveryLookup"
    />
    <VCFormGroup
        :label="true"
        :validation-messages="validationMessages.token_url.value"
        :validation-severity="getVuelidateSeverity($v.token_url)"
    >
        <template #label>
            Token
        </template>
        <VCFormInput
            v-model="$v.token_url.$model"
            placeholder="https://..."
        />
    </VCFormGroup>
    <VCFormGroup
        :label="true"
        :validation-messages="validationMessages.authorize_url.value"
        :validation-severity="getVuelidateSeverity($v.authorize_url)"
    >
        <template #label>
            Authorize
        </template>
        <VCFormInput
            v-model="$v.authorize_url.$model"
            placeholder="https://..."
        />
    </VCFormGroup>
    <VCFormGroup
        :label="true"
        :validation-messages="validationMessages.user_info_url.value"
        :validation-severity="getVuelidateSeverity($v.user_info_url)"
    >
        <template #label>
            UserInfo
        </template>
        <VCFormInput
            v-model="$v.user_info_url.$model"
            placeholder="https://..."
        />
    </VCFormGroup>
</template>
