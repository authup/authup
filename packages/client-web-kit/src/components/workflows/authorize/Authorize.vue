<!--
  - Copyright (c) 2025.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import type {
    Client,
    OAuth2AuthorizationCodeRequest,
    Realm,
    Scope,
} from '@authup/core-kit';
import { storeToRefs } from 'pinia';
import type { PropType, VNodeChild } from 'vue';
import {
    Suspense,
    defineComponent,
    h,
    ref,
} from 'vue';
import { TranslatorTranslationCommonKey, TranslatorTranslationNamespace } from '@authup/i18n';
import type { LinkProperties } from '@vuecs/link';
import { injectHTTPClient, injectStore, useTranslation } from '../../../core';
import AAuthShell from '../../utility/AAuthShell.vue';
import LoginForm from '../login/LoginForm.vue';
import AAccountPrompt from './AAccountPrompt.vue';
import AuthorizeForm from './AuthorizeForm.vue';
import AuthorizeRealmMismatch from './AuthorizeRealmMismatch.vue';
import AuthorizeText from './AuthorizeText.vue';

const OAUTH2_PROMPT_SELECT_ACCOUNT = 'select_account';

const wrapChild = (child: VNodeChild) => h(
    AAuthShell,
    null,
    { default: () => child },
);

type RealmSummary = Pick<Realm, 'id' | 'name' | 'display_name'>;

export default defineComponent({
    components: {
        AAccountPrompt,
        AuthorizeText,
        AuthorizeForm,
        AuthorizeRealmMismatch,
        LoginForm,
    },
    props: {
        codeRequest: { type: Object as PropType<OAuth2AuthorizationCodeRequest> },
        client: { type: Object as PropType<Client> },
        clientId: { type: String },
        scopes: { type: Array as PropType<Scope[]> },
        error: { type: Object as PropType<Error> },
        registerLink: { type: Object as PropType<LinkProperties> },
        passwordForgotLink: { type: Object as PropType<LinkProperties> },
        realm: { type: Object as PropType<RealmSummary> },
        redirectUriVerified: { type: Boolean, default: false },
    },
    emits: ['redirect', 'failed'],
    setup(props, { emit }) {
        const httpClient = injectHTTPClient();
        const store = injectStore();
        const {
            loggedIn,
            realmId,
            user,
        } = storeToRefs(store);

        // Local logout — the reactive loggedIn flip re-renders into the
        // realm-pinned login form below.
        const switchAccount = () => {
            store.logout();
        };

        // prompt=select_account chooser: once the user picks "continue as",
        // proceed past the chooser to consent for the rest of this render cycle.
        const accountConfirmed = ref<boolean>(false);

        const error = ref<Error | null>(null);
        const client = ref<Client | null>(null);

        const loadingText = useTranslation({
            namespace: TranslatorTranslationNamespace.COMMON,
            key: TranslatorTranslationCommonKey.LOADING,
        });

        const resolve = async () => {
            if (props.error) {
                error.value = props.error;
                return;
            }

            if (props.client) {
                client.value = props.client;
            }

            if (props.clientId) {
                try {
                    client.value = await httpClient.client.getOne(props.clientId);
                } catch (e) {
                    if (e instanceof Error) {
                        error.value = e;
                    }
                }
            }
        };

        Promise.resolve()
            .then(() => resolve());

        return () => {
            if (error.value) {
                return wrapChild(h(AuthorizeText, {
                    message: error.value.message,
                    isError: true,
                }));
            }

            if (!props.codeRequest) {
                return [];
            }

            if (!loggedIn.value) {
                return wrapChild(h(Suspense, {}, {
                    default: () => h(LoginForm, {
                        codeRequest: props.codeRequest,
                        registerLink: props.registerLink,
                        passwordForgotLink: props.passwordForgotLink,
                        usernameHint: props.codeRequest?.login_hint,
                        onFailed: (message: string) => emit('failed', message),
                    }),
                    fallback: () => h(AuthorizeText, { message: loadingText.value }),
                }));
            }

            const prompts = (props.codeRequest?.prompt ?? '').split(' ').filter(Boolean);

            // Realm binding (UX only — the server POST /authorize gate is
            // authoritative). Wait until the store has resolved the signed-in
            // identity's realm before deciding, so a built_in client's
            // AuthorizeForm auto-consent (onMounted) can't fire before a
            // mismatch is detected.
            if (!realmId.value) {
                return wrapChild(h(AuthorizeText, { message: loadingText.value }));
            }

            if (
                props.codeRequest.realm_id &&
                realmId.value !== props.codeRequest.realm_id
            ) {
                return wrapChild(h(AuthorizeRealmMismatch, {
                    clientName: props.client?.name ?? '',
                    targetRealmName: props.realm?.display_name || props.realm?.name || '',
                    redirectUri: props.codeRequest.redirect_uri,
                    state: props.codeRequest.state,
                    redirectUriVerified: props.redirectUriVerified,
                    onSwitch: switchAccount,
                }));
            }

            // prompt=select_account: offer "continue as X / use another account"
            // instead of silently continuing the current session.
            if (
                prompts.includes(OAUTH2_PROMPT_SELECT_ACCOUNT) &&
                !accountConfirmed.value
            ) {
                return wrapChild(h(AAccountPrompt, {
                    identityName: user.value?.name ?? user.value?.display_name ?? '',
                    onContinue: () => { accountConfirmed.value = true; },
                    onSwitch: switchAccount,
                }));
            }

            if (!client.value) {
                return [];
            }

            return wrapChild(h(Suspense, {}, {
                default: () => h(AuthorizeForm, {
                    codeRequest: props.codeRequest!,
                    client: client.value!,
                    scopes: props.scopes,
                    onLoginRequired: switchAccount,
                }),
                fallback: () => h(AuthorizeText, { message: loadingText.value }),
            }));
        };
    },
});
</script>
