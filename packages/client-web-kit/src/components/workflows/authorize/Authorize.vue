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
    computed,
    defineComponent,
    h,
    ref,
    watch,
} from 'vue';
import {
    TranslatorTranslationClientKey,
    TranslatorTranslationCommonKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import { OAuth2AuthorizationPrompt, OAuth2ErrorCode } from '@authup/specs';
import type { LinkProperties } from '@vuecs/link';
import {
    StoreAuthOrigin,
    injectHTTPClient,
    injectStore,
    useTranslation,
} from '../../../core';
import AAuthShell from '../../utility/AAuthShell.vue';
import LoginForm from '../login/LoginForm.vue';
import AAccountPrompt from './AAccountPrompt.vue';
import AuthorizeForm from './AuthorizeForm.vue';
import AuthorizeRealmMismatch from './AuthorizeRealmMismatch.vue';
import AuthorizeSilentRedirect from './AuthorizeSilentRedirect.vue';
import AuthorizeText from './AuthorizeText.vue';

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
        AuthorizeSilentRedirect,
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
            lastAuthOrigin,
            realmId,
            user,
        } = storeToRefs(store);

        // Local logout — the reactive loggedIn flip re-renders into the
        // realm-pinned login form below.
        const switchAccount = () => {
            store.logout();
        };

        // prompt=login: force re-authentication with a banner (instead of the
        // silent switchAccount) — set proactively for prompt=login, and when the
        // server's max_age/freshness backstop surfaces login_required mid-flow.
        const reauthRequired = ref<boolean>(false);

        // When a silent (prompt=none) request can only be resolved by
        // redirecting an OIDC error to the RP, this holds the error code and the
        // render returns AuthorizeSilentRedirect.
        const silentErrorCode = ref<`${OAuth2ErrorCode}` | null>(null);

        // A login_required from AuthorizeForm's auto-consent (the server
        // max_age/freshness backstop) — silent requests redirect the error;
        // interactive prompt=login shows the login form with a re-auth banner.
        const handleLoginRequired = () => {
            const prompts = (props.codeRequest?.prompt ?? '').split(' ').filter(Boolean);
            // Only redirect the OIDC error to a *verified* redirect_uri; an
            // unverified one degrades to interactive re-auth (falling through to
            // the login form) instead of dead-ending on a frozen spinner.
            if (prompts.includes(OAuth2AuthorizationPrompt.NONE) && props.redirectUriVerified) {
                silentErrorCode.value = OAuth2ErrorCode.LOGIN_REQUIRED;
                return;
            }

            reauthRequired.value = true;
            store.logout();
        };

        // prompt=select_account chooser: once the user picks "continue as",
        // proceed past the chooser to consent for the rest of this render cycle.
        const accountConfirmedLocal = ref<boolean>(false);

        // A login performed *on this page* IS the account selection — don't then
        // re-prompt "continue as X" for the account whose credentials were just
        // entered. The store stamps lastAuthOrigin only at the END of a settled
        // login()/exchange/restore, so watching it for a CHANGE to LOGIN during
        // this mount is race-free (unlike LoginForm's `done` emit, which is lost
        // when the token flip re-renders Authorize and unmounts the form — the
        // bug this replaced) and mount-scoped: a *lingering* session — whether
        // restored from cookies (origin RESTORE) or logged in before this page
        // was opened (origin already LOGIN, no change) — still gets the chooser,
        // while a fresh on-page login skips it.
        watch(lastAuthOrigin, (value) => {
            if (value === StoreAuthOrigin.LOGIN) {
                accountConfirmedLocal.value = true;
            }
        });

        const accountConfirmed = computed<boolean>(() => accountConfirmedLocal.value);

        const error = ref<Error | null>(null);
        const client = ref<Client | null>(null);

        const loadingText = useTranslation({
            namespace: TranslatorTranslationNamespace.COMMON,
            key: TranslatorTranslationCommonKey.LOADING,
        });

        const reauthText = useTranslation({
            namespace: TranslatorTranslationNamespace.CLIENT,
            key: TranslatorTranslationClientKey.REAUTH_TEXT,
        });

        // A silent (prompt=none) request that needs interaction must redirect
        // the OIDC error to the RP — but ONLY to a redirect_uri that matched a
        // registered client pattern. Without that, degrade to interactive UI.
        const silentRedirect = (errorCode: `${OAuth2ErrorCode}`): VNodeChild | null => {
            if (!props.codeRequest?.redirect_uri || !props.redirectUriVerified) {
                return null;
            }

            return wrapChild(h(AuthorizeSilentRedirect, {
                redirectUri: props.codeRequest.redirect_uri,
                error: errorCode,
                state: props.codeRequest.state,
            }));
        };

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

            const prompts = (props.codeRequest.prompt ?? '').split(' ').filter(Boolean);
            const isSilent = prompts.includes(OAuth2AuthorizationPrompt.NONE);
            const isReauth = prompts.includes(OAuth2AuthorizationPrompt.LOGIN);

            // A mid-flow login_required routed a silent request to an error
            // redirect (the store's max_age backstop). Emit it once it is known.
            if (isSilent && silentErrorCode.value) {
                const redirect = silentRedirect(silentErrorCode.value);
                if (redirect) {
                    return redirect;
                }
            }

            // Force re-authentication: prompt=login (proactive) or a login_required
            // surfaced mid-flow. Show the login form (with a banner) until a fresh
            // login on THIS page stamps lastAuthOrigin (accountConfirmed).
            const forceReauth = (isReauth || reauthRequired.value) && !accountConfirmed.value;

            if (!loggedIn.value || forceReauth) {
                // A silent request can never render a login form — redirect the
                // login_required error to the RP (falls through to the form only
                // when the redirect_uri was not verified).
                if (isSilent) {
                    const redirect = silentRedirect(OAuth2ErrorCode.LOGIN_REQUIRED);
                    if (redirect) {
                        return redirect;
                    }
                }

                const loginNode = h(Suspense, {}, {
                    default: () => h(LoginForm, {
                        codeRequest: props.codeRequest,
                        registerLink: props.registerLink,
                        passwordForgotLink: props.passwordForgotLink,
                        usernameHint: props.codeRequest?.login_hint,
                        // fresh-login → skip the chooser: handled race-free by
                        // the lastAuthOrigin watch, not LoginForm's `done`.
                        onFailed: (message: string) => emit('failed', message),
                    }),
                    fallback: () => h(AuthorizeText, { message: loadingText.value }),
                });

                // prompt=login / mid-flow re-auth: a banner above the form
                // explaining why credentials are requested again.
                return wrapChild(forceReauth ?
                    [h(AuthorizeText, { message: reauthText.value }), loginNode] :
                    loginNode);
            }

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
                // Silent: can't reuse a foreign-realm session → login_required.
                if (isSilent) {
                    const redirect = silentRedirect(OAuth2ErrorCode.LOGIN_REQUIRED);
                    if (redirect) {
                        return redirect;
                    }
                }

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
            // instead of silently continuing the current session. Wait for the
            // user to resolve so the chooser never flashes "Continue as " with an
            // empty name.
            if (
                prompts.includes(OAuth2AuthorizationPrompt.SELECT_ACCOUNT) &&
                !accountConfirmed.value
            ) {
                if (!user.value) {
                    return wrapChild(h(AuthorizeText, { message: loadingText.value }));
                }

                return wrapChild(h(AAccountPrompt, {
                    identityName: user.value.name ?? user.value.display_name ?? '',
                    onContinue: () => { accountConfirmedLocal.value = true; },
                    onSwitch: switchAccount,
                }));
            }

            if (!client.value) {
                return [];
            }

            // A silent request against a non-built_in client can't be
            // auto-consented (no persisted consent record) → consent_required.
            if (isSilent && !client.value.built_in) {
                const redirect = silentRedirect(OAuth2ErrorCode.CONSENT_REQUIRED);
                if (redirect) {
                    return redirect;
                }
            }

            return wrapChild(h(Suspense, {}, {
                default: () => h(AuthorizeForm, {
                    codeRequest: props.codeRequest!,
                    client: client.value!,
                    scopes: props.scopes,
                    // "Signed in as X — Not you?" switch affordance on the manual
                    // consent screen (present even when the RP sent no
                    // prompt=select_account).
                    identityName: user.value?.name ?? user.value?.display_name ?? '',
                    // Silent (built_in) request: auto-consent runs, but a failure
                    // must redirect an OIDC error, never render manual consent —
                    // but only when the redirect_uri is verified. Otherwise the
                    // error can't be redirected, so drop the silent flag and let
                    // AuthorizeForm fall back to interactive manual consent.
                    silent: isSilent && props.redirectUriVerified,
                    onSwitch: switchAccount,
                    onLoginRequired: handleLoginRequired,
                    onFailed: () => {
                        silentErrorCode.value = OAuth2ErrorCode.INTERACTION_REQUIRED;
                    },
                }),
                fallback: () => h(AuthorizeText, { message: loadingText.value }),
            }));
        };
    },
});
</script>
