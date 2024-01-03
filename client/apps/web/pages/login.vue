<script lang="ts">
import { isClientError } from '@hapic/oauth2';
import type { BuildInput } from 'rapiq';
import {
    AIdentityProviderIcon,
    AIdentityProviders,
    ARealms,
    ListPagination,
    ListSearch,
    ListTitle,
    injectAPIClient, useValidationTranslator,
} from '@authup/client-vue';
import type { IdentityProvider } from '@authup/core';
import useVuelidate from '@vuelidate/core';
import { maxLength, minLength, required } from '@vuelidate/validators';
import {
    toRef, watch,
} from 'vue';
import {
    definePageMeta,
    reactive, ref, useToast,
} from '#imports';
import {
    defineNuxtComponent, navigateTo, useRoute, useRuntimeConfig,
} from '#app';
import RealmSelectAction from '../components/RealmSelectAction';
import LoginSVG from '../components/svg/LoginSVG';
import { LayoutKey, LayoutNavigationID } from '../config/layout';
import { useAuthStore } from '../store/auth';

export default defineNuxtComponent({
    components: {
        ListPagination,
        ListSearch,
        ListTitle,
        LoginSVG,
        IdentityProviderList: AIdentityProviders,
        IdentityProviderIcon: AIdentityProviderIcon,
        RealmList: ARealms,
        RealmSelectAction,
    },
    setup() {
        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_OUT]: true,
            [LayoutKey.NAVIGATION_ID]: LayoutNavigationID.DEFAULT,
        });

        const apiClient = injectAPIClient();
        const toast = useToast();

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

        const store = useAuthStore();
        const runtimeConfig = useRuntimeConfig();

        const busy = ref(false);

        const realmId = toRef(form, 'realm_id');

        const identityProviderQuery : BuildInput<IdentityProvider> = {
            filters: {
                realm_id: realmId.value || '',
            },
        };
        const identityProviderRef = ref<null | { load:() => any, [key: string]: any}>(null);

        watch(realmId, async (val, oldVal) => {
            if (val !== oldVal) {
                if (identityProviderRef.value) {
                    identityProviderQuery.filters.realm_id = realmId.value;
                    identityProviderRef.value.load();
                }
            }
        });

        const submit = async () => {
            try {
                await store.login({
                    name: form.name,
                    password: form.password,
                    realmId: form.realm_id,
                });

                const route = useRoute();
                const { redirect, ...query } = route.query;

                navigateTo({
                    path: (redirect || '/') as string,
                    query,
                });
            } catch (e: any) {
                if (isClientError(e) && toast) {
                    toast.show({ variant: 'warning', body: e.message });
                }
            }
        };

        Promise.resolve()
            .then(store.logout);

        const buildIdentityProviderURL = (id: string) => apiClient.identityProvider.getAuthorizeUri(
            runtimeConfig.public.apiUrl,
            id,
        );

        return {
            vuelidate,
            translator: useValidationTranslator(),
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
    <div class="container">
        <h4>
            <i class="fa-solid fa-arrow-right-to-bracket pe-2" />
            Login
        </h4>
        <div class="text-center">
            <LoginSVG :height="320" />
        </div>
        <form @submit.prevent="submit">
            <div class="row">
                <div class="col-8">
                    <VCFormGroup
                        :validation-result="vuelidate.name"
                        :validation-translator="translator"
                    >
                        <template #label>
                            Name
                        </template>
                        <template #default>
                            <VCFormInput
                                v-model="form.name"
                            />
                        </template>
                    </VCFormGroup>

                    <VCFormGroup
                        :validation-result="vuelidate.password"
                        :validation-translator="translator"
                    >
                        <template #label>
                            Password
                        </template>
                        <template #default>
                            <VCFormInput
                                v-model="form.password"
                                type="password"
                            />
                        </template>
                    </VCFormGroup>

                    <VCFormSubmit
                        v-model="busy"
                        :validation-result="vuelidate"
                        :create-text="'Login'"
                        :create-button-class="{value: 'btn btn-sm btn-dark btn-block', presets: { bootstrap: false }}"
                        :create-icon-class="'fa-solid fa-right-to-bracket'"
                        :submit="submit"
                    />

                    <hr>

                    <IdentityProviderList
                        ref="identityProviderRef"
                        :query="identityProviderQuery"
                        :footer="false"
                    >
                        <template #footer="props">
                            <ListPagination
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
                                                <IdentityProviderIcon
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
                    </IdentityProviderList>
                </div>
                <div class="col-4">
                    <RealmList>
                        <template #header="props">
                            <ListTitle />
                            <ListSearch
                                :load="props.load"
                                :busy="props.busy"
                            />
                        </template>
                        <template #footer="props">
                            <ListPagination
                                :busy="props.busy"
                                :meta="props.meta"
                                :load="props.load"
                                :total="props.total"
                            />
                        </template>
                        <template #itemActions="props">
                            <RealmSelectAction
                                v-model="form.realm_id"
                                :list-ref="identityProviderRef"
                                :entity="props.data"
                            />
                        </template>
                    </RealmList>
                </div>
            </div>
        </form>
    </div>
</template>
<style scoped>
.identity-provider-box {
    min-width: 150px;
}
</style>
