<!--
  - Copyright (c) 2026.
  -  Author Peter Placzek (tada5hi)
  -  For the full copyright and license information,
  -  view the LICENSE file that was distributed with this source code.
  -->

<script lang="ts">
import {
    type PropType,
    computed,
    defineComponent,
    onMounted,
    reactive,
    useId,
    watch,
} from 'vue';
import { useValidup } from '@validup/vue';
import { 
    TranslatorTranslationClientKey, 
    TranslatorTranslationEntityKey, 
    TranslatorTranslationFieldKey, 
    TranslatorTranslationNamespace, 
} from '@authup/i18n';
import { 
    assignFormProperties, 
    injectStore, 
    storeToRefs, 
    useTranslations, 
    useTranslationsForNamespace, 
} from '../../../core';
import {
    type Client,
    ClientAuthMethod,
    ClientTokenBindingMethod,
    ClientValidator,
    EntityType,
    type Policy,
    buildClientCertificateURI,
} from '@authup/core-kit';
import { defineQuery } from '@rapiq/core';
import { OAuth2TokenGrant } from '@authup/specs';
import type { FormOption } from '@vuecs/forms';
import { VCFormCheckbox, VCFormCheckboxGroup } from '@vuecs/forms';
import {
    ValidatorGroup,
    generateName,
    generateSecret,
    isBCryptHash,
} from '@authup/kit';
import { ARealmPicker } from '../realm';
import APolicyPicker from '../policy/APolicyPicker.vue';
import {
    AFormInputList,
    AFormSubmit,
    ANameInput,
    ASecretInput,
    defineEntityManager,
    defineEntityVEmitOptions,
} from '../../utility';
import { useIsEditing, useUpdatedAt } from '../../../composables';
import { VCIcon } from '@vuecs/icon';
import { IFieldValidation } from '@ilingo/validup-vue';

export default defineComponent({
    components: {
        AFormSubmit,
        ANameInput,
        APolicyPicker,
        ASecretInput,
        ARealmPicker,
        AFormInputList,
        VCFormCheckbox,
        VCFormCheckboxGroup,
        VCIcon,

        IFieldValidation,
    },
    props: {
        name: {
            type: String,
            default: undefined,
        },
        entity: {
            type: Object as PropType<Client>,
            default: undefined,
        },
        realmId: {
            type: String,
            default: undefined,
        },
    },
    emits: defineEntityVEmitOptions<Client>(),
    setup(props, ctx) {
        const nameSeed = useId();
        const form = reactive({
            active: true,
            name: '',
            displayName: '',
            description: '',
            realmId: '',
            redirectUri: '',
            postLogoutRedirectUri: '',
            baseUrl: '',
            rootUrl: '',
            authMethod: `${ClientAuthMethod.SECRET}` as `${ClientAuthMethod}`,
            tokenBindingMethod: `${ClientTokenBindingMethod.NONE}` as `${ClientTokenBindingMethod}`,
            secret: '',
            secretHashed: false,
            grantTypes: null as string | null,
            accessPolicyId: null as string | null,
        });

        const manager = defineEntityManager({
            type: `${EntityType.CLIENT}`,
            setup: ctx,
            props,
        });

        const isEditing = useIsEditing(manager.data);

        // Shared `ClientValidator` from `@authup/core-kit`. Reactive
        // `group` flips between CREATE / UPDATE so the validator's
        // per-mount optional-ness matches the form's mode.
        const v = useValidup(
            new ClientValidator(),
            form,
            { group: computed(() => (isEditing.value ? ValidatorGroup.UPDATE : ValidatorGroup.CREATE)) },
        );

        const store = injectStore();
        const storeRefs = storeToRefs(store);

        const updatedAt = useUpdatedAt(() => props.entity);

        const isNameFixed = computed(() => !!props.name && props.name.length > 0);
        const realmId = computed(() => (manager.data.value ?
            manager.data.value.realmId :
            storeRefs.realmId.value));

        const isSecretHashed = computed(
            () => {
                if (!manager.data.value || manager.data.value.secret !== form.secret) {
                    return false;
                }

                return isBCryptHash(form.secret);
            },
        );

        function initForm() {
            if (props.name) {
                form.name = props.name;
            }

            assignFormProperties(form, manager.data.value, { fields: v.fields });

            if (form.name.length === 0) {
                form.name = generateName(nameSeed);
            }

            form.realmId = realmId.value ?? '';
        }

        // Secrets must stay unpredictable, so they can't be seeded from a
        // hydration-stable value the way names are. Generate the initial secret
        // client-side only to keep full entropy without an SSR hydration mismatch.
        onMounted(() => {
            if (form.authMethod === ClientAuthMethod.SECRET && form.secret.length === 0) {
                form.secret = generateSecret();
            }
        });

        const isSecretAuthentication = computed(() => form.authMethod === ClientAuthMethod.SECRET);
        const isTLSAuthentication = computed(() => form.authMethod === ClientAuthMethod.TLS);
        watch(isSecretAuthentication, (val, oldValue) => {
            if (val === oldValue) return;

            if (val) {
                form.secret = manager.data.value?.secret || generateSecret();
            } else {
                form.secret = '';
                form.secretHashed = false;
            }
        });

        watch(
            updatedAt,
            (val, oldVal) => {
                if (val && val !== oldVal) {
                    manager.data.value = props.entity;
                    initForm();
                }
            },
        );

        initForm();

        const submit = async () => {
            if (v.$invalid.value) {
                return;
            }

            await manager.createOrUpdate(form);

            assignFormProperties(form, manager.data.value, { fields: v.fields });
        };

        const translationsClient = useTranslationsForNamespace(
            TranslatorTranslationNamespace.CLIENT,
            [
                { key: TranslatorTranslationClientKey.NAME_HINT },
                { key: TranslatorTranslationClientKey.DESCRIPTION_HINT },
                { key: TranslatorTranslationClientKey.REDIRECT_URI_HINT },
                { key: TranslatorTranslationClientKey.POST_LOGOUT_REDIRECT_URI_HINT },
                { key: TranslatorTranslationClientKey.AUTH_METHOD },
                { key: TranslatorTranslationClientKey.AUTH_METHOD_NONE },
                { key: TranslatorTranslationClientKey.AUTH_METHOD_SECRET },
                { key: TranslatorTranslationClientKey.AUTH_METHOD_TLS },
                { key: TranslatorTranslationClientKey.TOKEN_BINDING_METHOD },
                { key: TranslatorTranslationClientKey.TOKEN_BINDING_METHOD_NONE },
                { key: TranslatorTranslationClientKey.TOKEN_BINDING_METHOD_TLS },
                { key: TranslatorTranslationClientKey.CLIENT_CERTIFICATE_URI },
                { key: TranslatorTranslationClientKey.CLIENT_CERTIFICATE_URI_HINT },
                { key: TranslatorTranslationClientKey.IS_ACTIVE },
                { key: TranslatorTranslationClientKey.HASH_SECRET },
                { key: TranslatorTranslationClientKey.GRANT_TYPES_HINT },
                { key: TranslatorTranslationClientKey.CLIENT_ACCESS_POLICY_HINT },
            ],
        );

        const translationsDefault = useTranslations(
            [
                {
                    namespace: TranslatorTranslationNamespace.FIELD,
                    key: TranslatorTranslationFieldKey.NAME,
                },
                {
                    namespace: TranslatorTranslationNamespace.FIELD, 
                    key: TranslatorTranslationFieldKey.DISPLAY_NAME, 
                },
                {
                    namespace: TranslatorTranslationNamespace.FIELD, 
                    key: TranslatorTranslationFieldKey.DESCRIPTION, 
                },
                {
                    namespace: TranslatorTranslationNamespace.ENTITY, 
                    key: TranslatorTranslationEntityKey.REALM, 
                    count: 1, 
                },
                {
                    namespace: TranslatorTranslationNamespace.FIELD,
                    key: TranslatorTranslationFieldKey.REDIRECT_URIS,
                },
                {
                    namespace: TranslatorTranslationNamespace.FIELD,
                    key: TranslatorTranslationFieldKey.POST_LOGOUT_REDIRECT_URIS,
                },
                {
                    namespace: TranslatorTranslationNamespace.FIELD,
                    key: TranslatorTranslationFieldKey.SECRET,
                },
                {
                    namespace: TranslatorTranslationNamespace.FIELD,
                    key: TranslatorTranslationFieldKey.GRANT_TYPES,
                },
                {
                    namespace: TranslatorTranslationNamespace.FIELD,
                    key: TranslatorTranslationFieldKey.ACCESS_POLICY,
                },
            ],
        );

        const redirectUris = computed(() => {
            const value = v.fields.redirectUri.$model.value as string | undefined;
            return value ? value.split(',') : [];
        });

        const postLogoutRedirectUris = computed(() => {
            const value = v.fields.postLogoutRedirectUri.$model.value as string | undefined;
            return value ? value.split(',') : [];
        });

        // `grantTypes` is a space/comma-delimited allowlist column; `null` (no
        // selection) means allow-all, so an emptied selection must clear the
        // column rather than persist an empty string.
        const grantTypeSelection = computed<string[]>(() => {
            const value = v.fields.grantTypes.$model.value as string | null | undefined;
            return value ? value.split(/[\s,]+/).filter(Boolean) : [];
        });

        // Unknown tokens (a grant authup does not implement yet) stay rendered
        // as checked options, so opening the form never silently strips them.
        const grantTypeOptions = computed<string[]>(() => [
            ...new Set<string>([
                ...Object.values(OAuth2TokenGrant),
                ...grantTypeSelection.value,
            ]),
        ]);

        const setGrantTypes = (input: unknown[]) => {
            const values = (input as string[]).filter(Boolean);
            v.fields.grantTypes.$model.value = values.length > 0 ? values.join(' ') : null;
        };

        const policyQuery = computed(() => defineQuery<Policy>({ filters: { realmId: [...(form.realmId ? [form.realmId] : []), null] } }));

        const authMethodOptions = computed<FormOption[]>(() => [
            { value: `${ClientAuthMethod.NONE}`, label: translationsClient.authMethodNone },
            { value: `${ClientAuthMethod.SECRET}`, label: translationsClient.authMethodSecret },
            { value: `${ClientAuthMethod.TLS}`, label: translationsClient.authMethodTls },
        ]);
        const tokenBindingMethodOptions = computed<FormOption[]>(() => [
            { value: `${ClientTokenBindingMethod.NONE}`, label: translationsClient.tokenBindingMethodNone },
            { value: `${ClientTokenBindingMethod.TLS}`, label: translationsClient.tokenBindingMethodTls },
        ]);
        const clientCertificateURI = computed(() => (manager.data.value ?
            buildClientCertificateURI(manager.data.value.id) :
            ''));

        return {
            translationsDefault,
            translationsClient,
            v,
            data: manager.data,
            isNameFixed,
            isBusy: manager.busy.value,
            isEditing,
            isSecretAuthentication,
            isTLSAuthentication,
            isSecretHashed,
            authMethodOptions,
            tokenBindingMethodOptions,
            clientCertificateURI,
            redirectUris,
            postLogoutRedirectUris,
            grantTypeSelection,
            grantTypeOptions,
            setGrantTypes,
            policyQuery,
            submit,
        };
    },
});
</script>
<template>
    <div class="flex flex-wrap -mx-2">
        <div class="flex-1 basis-0 px-2">
            <template v-if="data">
                <VCFormGroup>
                    <template #label>
                        ID
                    </template>
                    <VCFormInput
                        :model-value="data.id"
                        :disabled="true"
                    />
                </VCFormGroup>
            </template>

            <IFieldValidation
                v-slot="{ value }"
                :field="v.fields.name"
            >
                <VCFormGroup :validation="value">
                    <template #label>
                        {{ translationsDefault.name }}
                    </template>
                    <ANameInput
                        v-model="v.fields.name.$model.value"
                        :disabled="isNameFixed"
                    />
                    <template #hint>
                        {{ translationsClient.nameHint }}
                    </template>
                </VCFormGroup>
            </IFieldValidation>
            <IFieldValidation
                v-slot="{ value }"
                :field="v.fields.displayName"
            >
                <VCFormGroup :validation="value">
                    <template #label>
                        {{ translationsDefault.displayName }}
                    </template>
                    <VCFormInput
                        :model-value="v.fields.displayName.$model.value ?? ''"
                        :disabled="isNameFixed"
                        @update:model-value="(next: string) => { v.fields.displayName.$model.value = next; }"
                    />
                </VCFormGroup>
            </IFieldValidation>
            <IFieldValidation
                v-slot="{ value }"
                :field="v.fields.authMethod"
            >
                <VCFormGroup :validation="value">
                    <template #label>
                        {{ translationsClient.authMethod }}
                    </template>
                    <VCFormSelect
                        v-model="v.fields.authMethod.$model.value"
                        :options="authMethodOptions"
                    />
                </VCFormGroup>
            </IFieldValidation>
            <IFieldValidation
                v-slot="{ value }"
                :field="v.fields.tokenBindingMethod"
            >
                <VCFormGroup :validation="value">
                    <template #label>
                        {{ translationsClient.tokenBindingMethod }}
                    </template>
                    <VCFormSelect
                        v-model="v.fields.tokenBindingMethod.$model.value"
                        :options="tokenBindingMethodOptions"
                    />
                </VCFormGroup>
            </IFieldValidation>
            <template v-if="isTLSAuthentication && clientCertificateURI">
                <VCFormGroup>
                    <template #label>
                        {{ translationsClient.clientCertificateUri }}
                    </template>
                    <VCFormInput
                        :model-value="clientCertificateURI"
                        :disabled="true"
                    />
                    <template #hint>
                        {{ translationsClient.clientCertificateUriHint }}
                    </template>
                </VCFormGroup>
            </template>
            <IFieldValidation
                v-if="isSecretAuthentication"
                v-slot="{ value }"
                :field="v.fields.secret"
            >
                <VCFormGroup :validation="value">
                    <template #label>
                        {{ translationsDefault.secret }}
                        <template v-if="isSecretHashed">
                            <span class="text-error-600 font-bold">
                                <VCIcon name="fa6-solid:triangle-exclamation" />
                            </span>
                        </template>
                    </template>
                    <ASecretInput
                        :model-value="v.fields.secret.$model.value ?? ''"
                        @update:model-value="(next: string) => { v.fields.secret.$model.value = next; }"
                    />
                </VCFormGroup>
            </IFieldValidation>
            <div class="flex flex-wrap -mx-2">
                <div
                    v-if="isSecretAuthentication"
                    class="flex-1 basis-0 px-2"
                >
                    <IFieldValidation
                        v-slot="{ value }"
                        :field="v.fields.secretHashed"
                    >
                        <VCFormGroup :validation="value">
                            <VCFormSwitch
                                v-model="v.fields.secretHashed.$model.value"
                                :label="true"
                                :label-content="translationsClient.hashSecret"
                            />
                        </VCFormGroup>
                    </IFieldValidation>
                </div>
                <div class="flex-1 basis-0 px-2">
                    <IFieldValidation
                        v-slot="{ value }"
                        :field="v.fields.active"
                    >
                        <VCFormGroup :validation="value">
                            <VCFormSwitch
                                v-model="v.fields.active.$model.value"
                                :label="true"
                                :label-content="translationsClient.isActive"
                            />
                        </VCFormGroup>
                    </IFieldValidation>
                </div>
            </div>

            <template v-if="!realmId && !isEditing">
                <IFieldValidation
                    v-slot="{ value }"
                    :field="v.fields.realmId"
                >
                    <VCFormGroup :validation="value">
                        <template #label>
                            {{ translationsDefault.realm }}
                        </template>
                        <template #default>
                            <ARealmPicker
                                :value="v.fields.realmId.$model.value"
                                @change="(input: string[]) => {
                                    v.fields.realmId.$model.value = input.length > 0 ? input[0] ?? '' : '';
                                }"
                            />
                        </template>
                    </VCFormGroup>
                </IFieldValidation>
            </template>
        </div>
        <div class="flex-1 basis-0 px-2">
            <!--
                `AFormInputList`'s root carries no bottom margin (it is also
                nested INSIDE a VCFormGroup elsewhere, where a margin would
                double up), so a standalone use followed by a sibling has to
                match the `mb-3` the theme puts on stacked form groups.
            -->
            <AFormInputList
                class="mb-3"
                :names="redirectUris"
                @changed="(value) => {
                    if (value.length === 0) {
                        v.fields.redirectUri.$model.value = '';
                        return;
                    }
                    v.fields.redirectUri.$model.value = value.join(',');
                }"
            >
                <template #label>
                    {{ translationsDefault.redirectUris }}
                </template>
                <template #hint>
                    {{ translationsClient.redirectURIHint }}
                </template>
            </AFormInputList>
            <AFormInputList
                class="mb-3"
                :names="postLogoutRedirectUris"
                @changed="(value) => {
                    if (value.length === 0) {
                        v.fields.postLogoutRedirectUri.$model.value = null;
                        return;
                    }
                    v.fields.postLogoutRedirectUri.$model.value = value.join(',');
                }"
            >
                <template #label>
                    {{ translationsDefault.postLogoutRedirectUris }}
                </template>
                <template #hint>
                    {{ translationsClient.postLogoutRedirectURIHint }}
                </template>
            </AFormInputList>
            <IFieldValidation
                v-slot="{ value }"
                :field="v.fields.grantTypes"
            >
                <VCFormGroup :validation="value">
                    <template #label>
                        {{ translationsDefault.grantTypes }}
                    </template>
                    <VCFormCheckboxGroup
                        :model-value="grantTypeSelection"
                        @update:model-value="setGrantTypes"
                    >
                        <VCFormCheckbox
                            v-for="grantType in grantTypeOptions"
                            :key="grantType"
                            :value="grantType"
                            :label="true"
                            :label-content="grantType"
                        >
                            <!--
                                theme-tailwind's `formCheckbox.indicator` is
                                layout only, and the glyph lives in
                                `@vuecs/forms`' base stylesheet which the
                                tailwind stack does not load, so a checked box
                                renders as a solid square. Supply the check
                                ourselves until upstream ships one
                                (tada5hi/vuecs#1694).
                            -->
                            <template #indicator>
                                <VCIcon
                                    name="fa6-solid:check"
                                    class="text-[0.625rem]"
                                />
                            </template>
                        </VCFormCheckbox>
                    </VCFormCheckboxGroup>
                    <template #hint>
                        {{ translationsClient.grantTypesHint }}
                    </template>
                </VCFormGroup>
            </IFieldValidation>
            <IFieldValidation
                v-slot="{ value }"
                :field="v.fields.description"
            >
                <VCFormGroup :validation="value">
                    <template #label>
                        {{ translationsDefault.description }}
                    </template>
                    <VCFormTextarea
                        :model-value="v.fields.description.$model.value ?? ''"
                        rows="7"
                        @update:model-value="(next: string) => { v.fields.description.$model.value = next; }"
                    />
                    <template #hint>
                        {{ translationsClient.descriptionHint }}
                    </template>
                </VCFormGroup>
            </IFieldValidation>
            <IFieldValidation
                v-slot="{ value }"
                :field="v.fields.accessPolicyId"
            >
                <VCFormGroup :validation="value">
                    <template #label>
                        {{ translationsDefault.accessPolicy }}
                    </template>
                    <template #default>
                        <APolicyPicker
                            :value="v.fields.accessPolicyId.$model.value"
                            :query="policyQuery"
                            @change="(input: string[]) => {
                                v.fields.accessPolicyId.$model.value = input.length > 0 ? input[0] ?? null : null;
                            }"
                        />
                    </template>
                    <template #hint>
                        {{ translationsClient.clientAccessPolicyHint }}
                    </template>
                </VCFormGroup>
            </IFieldValidation>
            <div>
                <AFormSubmit
                    :is-busy="isBusy"
                    :is-editing="isEditing"
                    :is-invalid="v.$invalid.value"
                    @submit="submit"
                />
            </div>
        </div>
    </div>
</template>
