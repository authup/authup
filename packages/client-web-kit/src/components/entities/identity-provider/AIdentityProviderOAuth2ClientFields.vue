<!--
  - Copyright (c) 2023-2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import type { IdentityProvider, OAuth2IdentityProvider } from '@authup/core-kit';
import { IdentityProviderOAuth2AttributesValidator } from '@authup/core-kit';
import {
    TranslatorTranslationActionKey,
    TranslatorTranslationFieldKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import { splitOAuth2Scope } from '@authup/specs';
import { assignFormProperties, useTranslations } from '../../../core';
import { useValidup } from '@validup/vue';
import type { PropType } from 'vue';
import {
    computed,
    defineComponent,
    reactive,
    ref,
} from 'vue';
import { VCFormGroup, VCFormInput } from '@vuecs/forms';
import { VCIcon } from '@vuecs/icon';
import { onChange, useUpdatedAt } from '../../../composables';
import { IFieldValidation } from '@ilingo/validup-vue';
import { AFormInputList } from '../../utility';

export default defineComponent({
    components: {
        AFormInputList,
        VCFormGroup,
        VCFormInput,
        VCIcon,
        IFieldValidation,
    },
    props: { entity: { type: Object as PropType<Partial<IdentityProvider>> } },
    emits: ['updated'],
    setup(props) {
        const form = reactive({
            clientId: '', 
            clientSecret: '',
            scope: '',
            requiredAmr: '',
            requiredAcr: '',
        });

        const secretShow = ref(false);

        // Shared server-side validator, scoped to the keys this sub-form
        // owns via `pathsToInclude` — `clientId` stays required for every
        // OAuth2/OIDC flavor, `clientSecret` optional (a secret-less
        // public-client token exchange is a valid provider config), `scope`
        // optional (blank = protocol/preset default), and the two assurance
        // allow-lists optional (blank = trust the provider). The remaining
        // mounts (`preset`, endpoint URLs) belong to sibling sub-forms and
        // are filtered out here.
        const v = useValidup(
            new IdentityProviderOAuth2AttributesValidator({ pathsToInclude: ['clientId', 'clientSecret', 'scope', 'requiredAmr', 'requiredAcr'] }),
            form,
            { name: 'client' },
        );

        // `scope` is an optional key on `OAuth2IdentityProvider`, so the
        // typed `fields` accessor yields `FieldState | undefined` under
        // strict consumers — the dynamic `at()` accessor materialises the
        // state and is never undefined. Same for the assurance allow-lists.
        const scopeField = v.fields.at<string | null>('scope');
        const requiredAmrField = v.fields.at<string | null>('requiredAmr');
        const requiredAcrField = v.fields.at<string | null>('requiredAcr');

        const scopes = computed(() => splitOAuth2Scope(scopeField.$model.value));

        function assign() {
            assignFormProperties(form, props.entity as Partial<OAuth2IdentityProvider>, { fields: v.fields });
        }

        const updatedAt = useUpdatedAt(() => props.entity as IdentityProvider);
        onChange(updatedAt, () => assign());
        assign();

        const translations = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.CLIENT_ID,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.CLIENT_SECRET,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.SCOPE,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.REQUIRED_AMR,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.REQUIRED_ACR,
            },
            {
                namespace: TranslatorTranslationNamespace.ACTION,
                key: TranslatorTranslationActionKey.SHOW,
            },
            {
                namespace: TranslatorTranslationNamespace.ACTION,
                key: TranslatorTranslationActionKey.HIDE,
            },
        ]);

        const secretToggleLabel = computed(() => (secretShow.value ? translations.hide : translations.show));

        return {
            v,
            scopeField,
            requiredAmrField,
            requiredAcrField,
            scopes,
            secretShow,
            secretToggleLabel,
            translations,
        };
    },
});

</script>

<template>
    <div>
        <IFieldValidation
            v-slot="{ value }"
            :field="v.fields.clientId"
        >
            <VCFormGroup :validation="value">
                <template #label>
                    {{ translations.clientId }}
                </template>
                <VCFormInput v-model="v.fields.clientId.$model.value" />
            </VCFormGroup>
        </IFieldValidation>
        <IFieldValidation
            v-slot="{ value }"
            :field="v.fields.clientSecret"
        >
            <VCFormGroup :validation="value">
                <template #label>
                    {{ translations.clientSecret }}
                </template>
                <VCFormInput
                    v-model="v.fields.clientSecret.$model.value"
                    :type="secretShow ? 'text' : 'password'"
                    autocomplete="new-password"
                >
                    <template #groupAppend="{ class: appendClass }">
                        <button
                            type="button"
                            :class="appendClass"
                            class="cursor-pointer transition-colors hover:bg-bg-elevated"
                            :aria-label="secretToggleLabel"
                            :title="secretToggleLabel"
                            @click.prevent="secretShow = !secretShow"
                        >
                            <VCIcon
                                aria-hidden="true"
                                :name="secretShow ? 'fa6-solid:eye-slash' : 'fa6-solid:eye'"
                            />
                        </button>
                    </template>
                </VCFormInput>
            </VCFormGroup>
        </IFieldValidation>
        <AFormInputList
            :names="scopes"
            @changed="(value) => {
                scopeField.$model.value = value.length === 0 ? '' : value.join(' ');
            }"
        >
            <template #label>
                {{ translations.scope }}
            </template>
        </AFormInputList>
        <IFieldValidation
            v-slot="{ value }"
            :field="requiredAmrField"
        >
            <VCFormGroup :validation="value">
                <template #label>
                    {{ translations.requiredAmr }}
                </template>
                <VCFormInput
                    v-model="requiredAmrField.$model.value"
                    placeholder="mfa, hwk"
                />
            </VCFormGroup>
        </IFieldValidation>
        <IFieldValidation
            v-slot="{ value }"
            :field="requiredAcrField"
        >
            <VCFormGroup :validation="value">
                <template #label>
                    {{ translations.requiredAcr }}
                </template>
                <VCFormInput
                    v-model="requiredAcrField.$model.value"
                    placeholder="urn:mace:incommon:iap:silver"
                />
            </VCFormGroup>
        </IFieldValidation>
    </div>
</template>
