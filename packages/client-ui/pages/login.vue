<script lang="ts">
import { isClientError } from '@hapic/oauth2';
import type { BuildInput } from 'rapiq';
import { IdentityProviderList, RealmList, useAPIClient } from '@authup/client-vue';
import type { IdentityProvider } from '@authup/core';
import {
    FormInput, FormSubmit,
} from '@vue-layout/form-controls';
import useVuelidate from '@vuelidate/core';
import { maxLength, minLength, required } from '@vuelidate/validators';
import {
    toRef, watch,
} from 'vue';
import { useToast } from 'vue-toastification';
import {
    defineNuxtComponent, navigateTo, useNuxtApp, useRoute,
} from '#app';
import {
    definePageMeta, reactive, ref,
} from '#imports';
import RealmSelectAction from '../components/RealmSelectAction';
import LoginSVG from '../components/svg/LoginSVG';
import { translateValidationMessage } from '../composables/ilingo';
import { LayoutKey, LayoutNavigationID } from '../config/layout';
import { useAuthStore } from '../store/auth';

export default defineNuxtComponent({
    components: {
        LoginSVG,
        IdentityProviderList,
        RealmList,
        RealmSelectAction,
        FormSubmit,
        FormInput,
    },
    setup() {
        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_OUT]: true,
            [LayoutKey.NAVIGATION_ID]: LayoutNavigationID.DEFAULT,
        });

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
                if (isClientError(e)) {
                    const toast = useToast();
                    toast.warning(e.message);
                }
            }
        };

        Promise.resolve()
            .then(store.logout);

        const buildIdentityProviderURL = (id: string) => {
            const app = useNuxtApp();

            const apiClient = useAPIClient();
            return apiClient.identityProvider.getAuthorizeUri(
                app.$config.public.apiUrl,
                id,
            );
        };

        return {
            vuelidate,
            translateValidationMessage,
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
                    <FormInput
                        v-model="form.name"
                        :validation-result="vuelidate.name"
                        :validation-translator="translateValidationMessage"
                        :label="true"
                        :label-content="'Name'"
                    />

                    <FormInput
                        v-model="form.password"
                        type="password"
                        :validation-result="vuelidate.password"
                        :validation-translator="translateValidationMessage"
                        :label="true"
                        :label-content="'Password'"
                    />

                    <FormSubmit
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
                    >
                        <template #header>
                            <h6>IdentityProvider</h6>
                        </template>
                        <template #items="props">
                            <div class="d-flex flex-row">
                                <div
                                    v-for="(item, key) in props.data"
                                    :key="key"
                                >
                                    <a
                                        :href="buildIdentityProviderURL(item.id)"
                                        class="btn btn-primary btn-xs"
                                    >
                                        {{ item.name }}
                                    </a>
                                </div>
                            </div>
                        </template>
                    </IdentityProviderList>
                </div>
                <div class="col-4">
                    <RealmList>
                        <template #item-actions="props">
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
