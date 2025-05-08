<!--
  - Copyright (c) 2025.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import type { Ref } from 'vue';
import {
    computed,
    defineComponent,
    nextTick,
    reactive,
    ref,
} from 'vue';
import type { IdentityProvider } from '@authup/core-kit';
import { IdentityProviderProtocol } from '@authup/core-kit';
import { IVuelidate } from '@ilingo/vuelidate';
import useVuelidate from '@vuelidate/core';
import { maxLength, minLength, required } from '@vuelidate/validators';
import type { BuildInput } from 'rapiq';
import { injectHTTPClient, injectStore } from '../../core';
import {
    AIdentityProviderIcon, AIdentityProviders, ARealmPicker,
} from '../entities';
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
        clientId: {
            type: String,
        },
        redirectUri: {
            type: String,
        },
        realmId: {
            type: String,
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
            if (props.realmId) {
                return props.realmId;
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

            if (props.clientId) {
                authorizeURL += `?client_id=${props.clientId}`;

                if (props.redirectUri) {
                    authorizeURL += `&redirect_uri=${props.redirectUri}`;
                }
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

            <template v-if="!realmId">
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
