<!--
  Copyright (c) 2023.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
-->

<script lang="ts">
import type { IdentityProvider, OAuth2IdentityProvider } from '@authup/core-kit';
import {
    TranslatorTranslationActionKey,
    TranslatorTranslationFieldKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import type { OpenIDProviderMetadata } from '@authup/specs';
import { VCFormGroup, VCFormInput } from '@vuecs/forms';
import { Container } from 'validup';
import { createValidator } from '@validup/zod';
import { useValidup } from '@validup/vue';
import { assignFormProperties, useTranslations } from '../../../core';
import type { PropType } from 'vue';
import { defineComponent, reactive } from 'vue';
import { z } from 'zod';
import { onChange, useUpdatedAt } from '../../../composables';
import AIdentityProviderOAuth2Discovery from './AIdentityProviderOAuth2Discovery.vue';
import { IFieldValidation } from '@ilingo/validup-vue';

// Mirrors the endpoint rules of the server-side
// `IdentityProviderOAuth2AttributesValidator` (`@authup/core-kit`):
// `token_url` and `authorize_url` are required for non-preset OAuth2/OIDC
// providers (this sub-form is only rendered when no preset is selected),
// `user_info_url` stays optional. The server is authoritative.
class OAuth2EndpointFieldsValidator extends Container<{
    token_url: string;
    authorize_url: string;
    user_info_url: string;
}> {
    protected override initialize() {
        super.initialize();
        this.mount('token_url', createValidator(z.url()));
        this.mount('authorize_url', createValidator(z.url()));
        this.mount('user_info_url', { optional: true }, createValidator(
            z.url().optional().nullable(),
        ));
    }
}

export default defineComponent({
    components: {
        VCFormGroup,
        VCFormInput,
        AIdentityProviderOAuth2Discovery,

        IFieldValidation,
    },
    props: {
        entity: { type: Object as PropType<Partial<IdentityProvider>> },
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

        const v = useValidup(new OAuth2EndpointFieldsValidator(), form, { name: 'endpoint' });

        function init() {
            form.token_url = '';
            form.authorize_url = '';
            form.user_info_url = '';

            if (!props.entity) return;

            assignFormProperties(form, props.entity as Partial<OAuth2IdentityProvider>);
        }

        const updated = useUpdatedAt(props.entity as IdentityProvider);
        onChange(updated, () => init());

        init();

        const handleDiscoveryLookup = (data: OpenIDProviderMetadata) => {
            form.authorize_url = data.authorization_endpoint;
            form.token_url = data.token_endpoint;
        };

        const translations = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.TOKEN,
            },
            {
                namespace: TranslatorTranslationNamespace.ACTION,
                key: TranslatorTranslationActionKey.AUTHORIZE,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.USER_INFO,
            },
        ]);

        return {
            v,
            translations,
            handleDiscoveryLookup,
        };
    },
});
</script>
<template>
    <AIdentityProviderOAuth2Discovery
        v-if="discovery"
        @lookup="handleDiscoveryLookup"
    />
    <IFieldValidation
        v-slot="{ value }"
        :field="v.fields.token_url"
    >
        <VCFormGroup
            :label="true"
            :validation="value"
        >
            <template #label>
                {{ translations.token }}
            </template>
            <VCFormInput
                v-model="v.fields.token_url.$model.value"
                placeholder="https://..."
            />
        </VCFormGroup>
    </IFieldValidation>
    <IFieldValidation
        v-slot="{ value }"
        :field="v.fields.authorize_url"
    >
        <VCFormGroup
            :label="true"
            :validation="value"
        >
            <template #label>
                {{ translations.authorize }}
            </template>
            <VCFormInput
                v-model="v.fields.authorize_url.$model.value"
                placeholder="https://..."
            />
        </VCFormGroup>
    </IFieldValidation>
    <IFieldValidation
        v-slot="{ value }"
        :field="v.fields.user_info_url"
    >
        <VCFormGroup
            :label="true"
            :validation="value"
        >
            <template #label>
                {{ translations.userInfo }}
            </template>
            <VCFormInput
                v-model="v.fields.user_info_url.$model.value"
                placeholder="https://..."
            />
        </VCFormGroup>
    </IFieldValidation>
</template>
