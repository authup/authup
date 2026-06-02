<!--
  Copyright (c) 2023.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
-->

<script lang="ts">
import type { IdentityProvider, OAuth2IdentityProvider } from '@authup/core-kit';
import type { OpenIDProviderMetadata } from '@authup/specs';
import { VCFormGroup, VCFormInput } from '@vuecs/forms';
import { Container } from 'validup';
import { useValidup } from '@validup/vue';
import { useFieldValidation } from '@ilingo/validup-vue';
import type { PropType } from 'vue';
import { defineComponent, reactive } from 'vue';
import { onChange, useUpdatedAt } from '../../../composables';
import { assignFormProperties } from '../../../core';
import { AIdentityProviderOAuth2Discovery } from './AIdentityProviderOAuth2Discovery.vue';

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

        const $v = useValidup(new Container<typeof form>(), form, { name: 'endpoint' });

        function init() {
            form.token_url = '';
            form.authorize_url = '';
            form.user_info_url = '';

            if (!props.entity) return;

            assignFormProperties(form, props.entity);
        }

        const updated = useUpdatedAt(props.entity as IdentityProvider);
        onChange(updated, () => init());

        init();

        const handleDiscoveryLookup = (data: OpenIDProviderMetadata) => {
            form.authorize_url = data.authorization_endpoint;
            form.token_url = data.token_endpoint;
        };

        return {
            $v,
            handleDiscoveryLookup,
            useFieldValidation,
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
        :validation="useFieldValidation($v.fields.token_url)"
    >
        <template #label>
            Token
        </template>
        <VCFormInput
            v-model="$v.fields.token_url.$model"
            placeholder="https://..."
        />
    </VCFormGroup>
    <VCFormGroup
        :label="true"
        :validation="useFieldValidation($v.fields.authorize_url)"
    >
        <template #label>
            Authorize
        </template>
        <VCFormInput
            v-model="$v.fields.authorize_url.$model"
            placeholder="https://..."
        />
    </VCFormGroup>
    <VCFormGroup
        :label="true"
        :validation="useFieldValidation($v.fields.user_info_url)"
    >
        <template #label>
            UserInfo
        </template>
        <VCFormInput
            v-model="$v.fields.user_info_url.$model"
            placeholder="https://..."
        />
    </VCFormGroup>
</template>
