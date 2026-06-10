<script lang="ts">
import { base64URLEncode } from '@authup/kit';
import type { PropType, Ref } from 'vue';
import {
    computed,
    defineComponent,
    nextTick,
    reactive,
    ref,
} from 'vue';
import type { IdentityProvider, OAuth2AuthorizationCodeRequest } from '@authup/core-kit';
import { IdentityProviderProtocol } from '@authup/core-kit';
import { useValidup } from '@validup/vue';
import { 
    TranslatorTranslationActionKey, 
    TranslatorTranslationClientKey, 
    TranslatorTranslationEntityKey, 
    TranslatorTranslationFieldKey, 
    TranslatorTranslationNamespace, 
} from '@authup/i18n';
import {
    injectHTTPClient,
    injectStore,
    useTranslations,
    useTranslator,
} from '../../../core';
import { createValidator } from '@validup/zod';
import { Container } from 'validup';
import { z } from 'zod';
import type { BuildInput } from 'rapiq';
import { VCButton } from '@vuecs/button';
import { VCFormGroup, VCFormInput, useSubmitButton } from '@vuecs/forms';
import type { LinkProperties } from '@vuecs/link';
import { VCLink } from '@vuecs/link';
import { AIdentityProviderIcon, AIdentityProviders, ARealmPicker } from '../../entities';
import { APagination, ATitle } from '../../utility';
import { IFieldValidation } from '@ilingo/validup-vue';

// Inline by design — login deliberately uses a permissive credentials
// shape (any non-empty min/max-bounded string) rather than reusing
// `UserValidator`'s `isUserNameValid` check, which enforces the
// canonical *creation* rules. The server is the authoritative
// credentials check; the form just needs basic length validation so
// the user gets immediate feedback instead of a round-trip 401.
// Not a candidate for promotion to `@authup/core-kit` — login is not
// an entity edit.
class LoginCredentialsValidator extends Container<{
    name: string;
    password: string;
    realm_id: string;
}> {
    protected override initialize() {
        super.initialize();
        this.mount('name', createValidator(z.string().min(3).max(255)));
        this.mount('password', createValidator(z.string().min(3).max(255)));
        this.mount('realm_id', { optional: true }, createValidator(z.string()));
    }
}

export default defineComponent({
    components: {
        ARealmPicker,
        APagination,
        ATitle,
        AIdentityProviders,
        AIdentityProviderIcon,
        VCButton,
        VCFormGroup,
        VCFormInput,
        VCLink,

        IFieldValidation,
    },
    props: {
        codeRequest: { type: Object as PropType<OAuth2AuthorizationCodeRequest> },
        // Presence of a link prop shows the corresponding link beneath the
        // form. VCLink resolves RouterLink/NuxtLink when a router is present
        // and `to` is used, otherwise renders a plain anchor — the consumer
        // controls navigation policy through the props themselves.
        registerLink: { type: Object as PropType<LinkProperties> },
        passwordForgotLink: { type: Object as PropType<LinkProperties> },
    },
    emits: ['done', 'failed'],
    setup(props, { emit }) {
        const apiClient = injectHTTPClient();
        const store = injectStore();

        const form = reactive({
            name: '',
            password: '',
            realm_id: '',
        });

        const v = useValidup(new LoginCredentialsValidator(), form);

        const translationsDefault = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.ACTION, 
                key: TranslatorTranslationActionKey.LOGIN, 
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD, 
                key: TranslatorTranslationFieldKey.NAME, 
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD, 
                key: TranslatorTranslationFieldKey.PASSWORD, 
            },
            {
                namespace: TranslatorTranslationNamespace.ENTITY,
                key: TranslatorTranslationEntityKey.IDENTITY_PROVIDER,
                count: 2,
            },
            {
                namespace: TranslatorTranslationNamespace.CLIENT,
                key: TranslatorTranslationClientKey.CREATE_ACCOUNT,
            },
            {
                namespace: TranslatorTranslationNamespace.CLIENT,
                key: TranslatorTranslationClientKey.FORGOT_PASSWORD,
            },
        ]);

        const translate = useTranslator();

        const busy = ref(false);

        const realmId = computed(() => {
            if (props.codeRequest && props.codeRequest.realm_id) {
                return props.codeRequest.realm_id;
            }

            return form.realm_id;
        });

        const identityProviderQuery: Ref<BuildInput<IdentityProvider>> = ref({});
        const resetIdentityProviderQuery = () => {
            identityProviderQuery.value = {
                filters: {
                    realm_id: realmId.value || '',
                    protocol: `!${IdentityProviderProtocol.LDAP}`,
                    enabled: true,
                },
            };
        };

        resetIdentityProviderQuery();

        const identityProviderRef = ref<null | {
            load: () => Promise<void>,
            [key: string]: unknown
        }>(null);
        const updateIdentityProviderList = () => {
            if (identityProviderRef.value) {
                identityProviderRef.value.load();
            }
        };

        const updateRealmId = (realmId: string | string[]) => {
            form.realm_id = Array.isArray(realmId) ? realmId[0] ?? '' : realmId;

            resetIdentityProviderQuery();

            nextTick(() => {
                updateIdentityProviderList();
            });
        };

        const submit = async () => {
            try {
                await store.login({
                    name: form.name,
                    password: form.password,
                    realmId: form.realm_id,
                });

                emit('done');
            } catch (e: unknown) {
                emit('failed', e instanceof Error ?
                    e.message :
                    await translate({
                        namespace: TranslatorTranslationNamespace.CLIENT,
                        key: TranslatorTranslationClientKey.LOGIN_FAILED,
                    }));
            }
        };

        const buildIdentityProviderURL = (id: string) => {
            let authorizeURL = apiClient.identityProvider.getAuthorizeUri(id);

            if (props.codeRequest) {
                const serialized = base64URLEncode(JSON.stringify(props.codeRequest));
                authorizeURL += `?codeRequest=${serialized}`;
            }

            return authorizeURL;
        };

        // useSubmitButton from @vuecs/forms returns a computed binding
        // for VCButton ({ type: 'submit', label, iconLeft, color,
        // loading, disabled }). Defaults flow through the vuecs
        // defaults manager so consumers can override label/icon globally;
        // we override `label` per call below ("Login" instead of the
        // default "Create"/"Update"). The submission itself is fired by
        // <form @submit.prevent="submit"> — VCButton just needs to be
        // type="submit", which the composable already sets.
        const submitButton = useSubmitButton({
            loading: busy,
            disabled: computed(() => busy.value || v.$invalid.value),
        });

        return {
            updateRealmId,
            v,
            form,
            submit,
            busy,
            submitButton,
            identityProviderQuery,
            identityProviderRef,
            buildIdentityProviderURL,
            translationsDefault,
        };
    },
});
</script>
<template>
    <div>
        <div class="text-center">
            <h1 class="font-bold">
                {{ translationsDefault.login }}
            </h1>
        </div>
        <form @submit.prevent="submit">
            <IFieldValidation
                v-slot="{ value }"
                :field="v.fields.name"
            >
                <VCFormGroup :validation="value">
                    <template #label>
                        {{ translationsDefault.name }}
                    </template>
                    <VCFormInput v-model="v.fields.name.$model.value" />
                </VCFormGroup>
            </IFieldValidation>

            <IFieldValidation
                v-slot="{ value }"
                :field="v.fields.password"
            >
                <VCFormGroup :validation="value">
                    <template #label>
                        {{ translationsDefault.password }}
                    </template>
                    <VCFormInput
                        v-model="v.fields.password.$model.value"
                        type="password"
                    />
                </VCFormGroup>
            </IFieldValidation>

            <!--
                <VCFormSubmit> from form-controls 2.x was dropped in
                @vuecs/forms 4.x. The 4.x replacement is the
                useSubmitButton() composable (see setup() above) which
                returns a v-bind-ready computed binding ({ type, label,
                iconLeft, color, loading, disabled }) for VCButton. The
                parent <form @submit.prevent="submit"> catches the
                submission — no @click handler needed here. We override
                `label` to "Login" because the composable's default
                (sourced from the vuecs defaults manager) is "Create".
            -->
            <VCButton
                v-bind="submitButton"
                :label="translationsDefault.login"
                class="w-full"
            />

            <div
                v-if="registerLink || passwordForgotLink"
                class="flex flex-row justify-between mt-2 text-sm"
            >
                <VCLink
                    v-if="registerLink"
                    v-bind="registerLink"
                >
                    {{ translationsDefault.createAccount }}
                </VCLink>
                <VCLink
                    v-if="passwordForgotLink"
                    v-bind="passwordForgotLink"
                    class="ms-auto"
                >
                    {{ translationsDefault.forgotPassword }}
                </VCLink>
            </div>

            <hr>

            <template v-if="!codeRequest || !codeRequest.realm_id">
                <ARealmPicker
                    :value="form.realm_id"
                    @change="updateRealmId"
                />
            </template>

            <AIdentityProviders
                ref="identityProviderRef"
                :query="identityProviderQuery"
                :footer="false"
            >
                <template #header>
                    <ATitle :text="translationsDefault.identityProvider" />
                </template>
                <template #footer="props">
                    <APagination
                        :busy="props.busy"
                        :meta="props.meta"
                        :load="(data?: any) => props.load?.(data)"
                        :total="props.total"
                    />
                </template>
                <template #body="props">
                    <div class="flex flex-row flex-wrap gap-1">
                        <div
                            v-for="(item, key) in props.data"
                            :key="key"
                            class="identity-provider-item"
                        >
                            <a
                                :href="buildIdentityProviderURL(item.id)"
                                class="btn btn-dark btn-xs p-2 identity-provider-box bg-fg"
                            >
                                <div class="flex flex-col">
                                    <div class="text-center mb-1">
                                        <AIdentityProviderIcon
                                            class="text-2xl"
                                            :entity="item"
                                        />
                                    </div>
                                    <div>
                                        {{ item.name }}
                                    </div>
                                </div>
                            </a>
                        </div>
                    </div>
                </template>
            </AIdentityProviders>
        </form>
    </div>
</template>
<style scoped>
/* Constrained by the auth-shell card (max-width 460px): boxes wrap into
   rows and never grow past the card's inner width, so a long provider
   list or name can't spill over the card corner. */
.identity-provider-item {
    min-width: 0;
    max-width: 100%;
}

.identity-provider-box {
    min-width: 120px;
    max-width: 100%;
    word-break: break-word;
}
</style>
