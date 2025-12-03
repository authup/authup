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

    },
    props: {
        codeRequest: {
            type: Object as PropType<OAuth2AuthorizationCodeRequest>,
        },
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
            realm_id: {

            },

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

        const identityProviderRef = ref<null | { load:() => any, [key: string]: any}>(null);
        const updateIdentityProviderList = () => {
            if (identityProviderRef.value) {
                identityProviderRef.value.load();
            }
        };

        const updateRealmId = (realmId: string | string[]) => {
            form.realm_id = Array.isArray(realmId) ? realmId[0] : realmId;

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
            } catch (e: any) {
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

        return {

            updateRealmId,

            vuelidate,
            form,
            submit,
            busy,

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
            <h1 class="fw-bold">
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

            <VCFormSubmit
                v-model="busy"
                :invalid="vuelidate.$invalid"
                :create-text="'Submit'"
                :create-button-class="{value: 'btn btn-sm btn-dark btn-block', presets: { bootstrap: false }}"
                :create-icon-class="'fa-solid fa-right-to-bracket'"
                :submit="submit"
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
                        :load="props.load"
                        :total="props.total"
                    />
                </template>
                <template #body="props">
                    <div class="d-flex flex-row">
                        <div
                            v-for="(item, key) in props.data"
                            :key="key"
                        >
                            <a
                                :href="buildIdentityProviderURL(item.id)"
                                class="btn btn-dark btn-xs p-2 me-1 identity-provider-box bg-dark"
                            >
                                <div class="d-flex flex-column">
                                    <div class="text-center mb-1">
                                        <AIdentityProviderIcon
                                            class="fa-2x"
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
