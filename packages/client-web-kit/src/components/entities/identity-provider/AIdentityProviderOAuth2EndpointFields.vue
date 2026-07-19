<!--
  Copyright (c) 2023.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
-->

<script lang="ts">
import type { IdentityProvider, OAuth2IdentityProvider } from '@authup/core-kit';
import { IdentityProviderOAuth2AttributesValidator } from '@authup/core-kit';
import {
    TranslatorTranslationActionKey,
    TranslatorTranslationFieldKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import type { OpenIDProviderMetadata } from '@authup/specs';
import { VCFormGroup, VCFormInput } from '@vuecs/forms';
import { useValidup } from '@validup/vue';
import { assignFormProperties, useTranslations } from '../../../core';
import type { PropType } from 'vue';
import { defineComponent, reactive } from 'vue';
import { onChange, useUpdatedAt } from '../../../composables';
import AIdentityProviderOAuth2Discovery from './AIdentityProviderOAuth2Discovery.vue';
import { IFieldValidation } from '@ilingo/validup-vue';

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
            tokenUrl: '',
            authorizeUrl: '',
            userInfoUrl: '',
        });

        // Shared server-side validator, scoped to the endpoint keys via
        // `pathsToInclude` — `tokenUrl` and `authorizeUrl` are required
        // for non-preset OAuth2/OIDC providers (this sub-form is only
        // rendered when no preset is selected), `userInfoUrl` optional.
        const v = useValidup(
            new IdentityProviderOAuth2AttributesValidator({ pathsToInclude: ['tokenUrl', 'authorizeUrl', 'userInfoUrl'] }),
            form,
            { name: 'endpoint' },
        );

        // `userInfoUrl` is an optional key on `OAuth2IdentityProvider`, so
        // the typed `fields` accessor yields `FieldState | undefined` for it
        // under strict consumers (the apps compile this source through their
        // `@authup/* → src` aliases with `strict: true`). The dynamic `at()`
        // accessor materialises the state and is never undefined.
        const userInfoUrlField = v.fields.at<string | null>('userInfoUrl');

        function init() {
            // blank via the helper so an unsaved (dirty) edit survives an
            // entity refresh instead of being wiped before the re-assign
            assignFormProperties(form, {
                tokenUrl: null,
                authorizeUrl: null,
                userInfoUrl: null,
            }, { fields: v.fields });

            if (!props.entity) return;

            assignFormProperties(form, props.entity as Partial<OAuth2IdentityProvider>, { fields: v.fields });
        }

        const updated = useUpdatedAt(() => props.entity as IdentityProvider);
        onChange(updated, () => init());

        init();

        const handleDiscoveryLookup = (data: OpenIDProviderMetadata) => {
            // through $model so the discovered values count as user edits
            // (dirty) and survive a concurrent entity refresh
            v.fields.authorizeUrl.$model.value = data.authorization_endpoint;
            v.fields.tokenUrl.$model.value = data.token_endpoint;
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
            userInfoUrlField,
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
        :field="v.fields.tokenUrl"
    >
        <VCFormGroup
            :label="true"
            :validation="value"
        >
            <template #label>
                {{ translations.token }}
            </template>
            <VCFormInput
                v-model="v.fields.tokenUrl.$model.value"
                placeholder="https://..."
            />
        </VCFormGroup>
    </IFieldValidation>
    <IFieldValidation
        v-slot="{ value }"
        :field="v.fields.authorizeUrl"
    >
        <VCFormGroup
            :label="true"
            :validation="value"
        >
            <template #label>
                {{ translations.authorize }}
            </template>
            <VCFormInput
                v-model="v.fields.authorizeUrl.$model.value"
                placeholder="https://..."
            />
        </VCFormGroup>
    </IFieldValidation>
    <IFieldValidation
        v-slot="{ value }"
        :field="userInfoUrlField"
    >
        <VCFormGroup
            :label="true"
            :validation="value"
        >
            <template #label>
                {{ translations.userInfo }}
            </template>
            <VCFormInput
                v-model="userInfoUrlField.$model.value"
                placeholder="https://..."
            />
        </VCFormGroup>
    </IFieldValidation>
</template>
