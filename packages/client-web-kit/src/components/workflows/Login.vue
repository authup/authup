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
import { IVuelidate } from '@ilingo/vuelidate';
import useVuelidate from '@vuelidate/core';
import { maxLength, minLength, required } from '@vuelidate/validators';
import type { BuildInput } from 'rapiq';
import { VCButton } from '@vuecs/button';
import { VCFormGroup, VCFormInput, useSubmitButton } from '@vuecs/forms';
import { injectHTTPClient, injectStore } from '../../core';
import { AIdentityProviderIcon, AIdentityProviders, ARealmPicker } from '../entities';
import { APagination, ATitle } from '../utility';

export default defineComponent({

    components: {

        ARealmPicker,
        APagination,
        ATitle,
        IVuelidate,
        AIdentityProviders,
        AIdentityProviderIcon,
        VCButton,
        VCFormGroup,
        VCFormInput,

    },
    props: { codeRequest: { type: Object as PropType<OAuth2AuthorizationCodeRequest> } },
    emits: ['done', 'failed'],
    setup(props, { emit }) {
        const apiClient = injectHTTPClient();
        const store = injectStore();

        const form = reactive({
            name: '',
            password: '',
            realm_id: '',

        });

        const vuelidate = useVuelidate({
            name: {
                required,
                minLength: minLength(3),
                maxLength: maxLength(255),

            },
            password: {
                required,
                minLength: minLength(3),
                maxLength: maxLength(255),

            },
            realm_id: {},

        }, form);

        const busy = ref(false);

        const realmId = computed(() => {
            if (props.codeRequest && props.codeRequest.realm_id) {
                return props.codeRequest.realm_id;
            }

            return form.realm_id;
        });

        const identityProviderQuery : Ref<BuildInput<IdentityProvider>> = ref({});
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
            load:() => Promise<void>,
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
                emit('failed', e instanceof Error ? e.message : 'The login operation failed');
            }
        };

        const buildIdentityProviderURL = (id: string) => {
            let authorizeURL = apiClient.identityProvider.getAuthorizeUri(
                id,

            );

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
            disabled: computed(() => busy.value || vuelidate.value.$invalid),
        });

        return {

            updateRealmId,

            vuelidate,
            form,
            submit,
            busy,
            submitButton,

            identityProviderQuery,
            identityProviderRef,
            buildIdentityProviderURL,

        };
    },
});
</script>
<template>
    <div>
        <div class="text-center">
            <h1 class="font-bold">
                Login
            </h1>
        </div>
        <form @submit.prevent="submit">
            <IVuelidate :validation="vuelidate.name">
                <template #default="props">
                    <VCFormGroup
                        :validation-messages="props.data"
                        :validation-severity="props.severity"
                    >
                        <template #label>
                            Name
                        </template>
                        <template #default>
                            <VCFormInput
                                v-model="vuelidate.name.$model"
                            />
                        </template>
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
                        <template #default>
                            <VCFormInput
                                v-model="vuelidate.password.$model"
                                type="password"
                            />
                        </template>
                    </VCFormGroup>
                </template>
            </IVuelidate>

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
                label="Login"
                class="w-full"
            />

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
                    <ATitle :text="'Identity Providers'" />
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
                    <div class="flex flex-row">
                        <div
                            v-for="(item, key) in props.data"
                            :key="key"
                        >
                            <a
                                :href="buildIdentityProviderURL(item.id)"
                                class="btn btn-dark btn-xs p-2 me-1 identity-provider-box bg-fg"
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
.identity-provider-box {
    min-width: 150px;
}
</style>
