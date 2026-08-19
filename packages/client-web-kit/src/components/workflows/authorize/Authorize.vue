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
    UserAuthenticatorKind,
} from '@authup/core-kit';
import type {
    UserAuthenticatorChallengeResponse,
    UserAuthenticatorChallengeVerifyResponse,
} from '@authup/core-http-kit';
import { ErrorCode } from '@authup/errors';
import { storeToRefs } from 'pinia';
import type { PropType, VNodeChild } from 'vue';
import {
    Suspense,
    computed,
    defineComponent,
    h,
    onMounted,
    ref,
    watch,
} from 'vue';
import {
    TranslatorTranslationClientKey,
    TranslatorTranslationCommonKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import {
    OAuth2AuthenticationContextClass,
    OAuth2AuthorizationPrompt,
    OAuth2ErrorCode,
    unwrapOAuth2Scope,
} from '@authup/specs';
import type { LinkProps } from '@vuecs/link';
import {
    StoreAuthOrigin,
    consumeFederatedLoginChallenge,
    extractErrorContext,
    injectHTTPClient,
    injectStore,
    useTranslation,
} from '../../../core';
import AAuthShell from '../../utility/AAuthShell.vue';
import LoginForm from '../login/LoginForm.vue';
import AMfaChallengeForm from '../mfa/AMfaChallengeForm.vue';
import AUserAuthenticatorEnroll from '../../entities/user-authenticator/AUserAuthenticatorEnroll.vue';
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

type RealmSummary = Pick<Realm, 'id' | 'name' | 'displayName'>;

export default defineComponent({
    components: {
        AAccountPrompt,
        AuthorizeText,
        AuthorizeForm,
        AuthorizeRealmMismatch,
        AuthorizeSilentRedirect,
        AMfaChallengeForm,
        AUserAuthenticatorEnroll,
        LoginForm,
    },
    props: {
        codeRequest: { type: Object as PropType<OAuth2AuthorizationCodeRequest> },
        client: { type: Object as PropType<Client> },
        clientId: { type: String },
        scopes: { type: Array as PropType<Scope[]> },
        error: { type: Object as PropType<Error> },
        registerLink: { type: Object as PropType<LinkProps> },
        passwordForgotLink: { type: Object as PropType<LinkProps> },
        realm: { type: Object as PropType<RealmSummary> },
        redirectUriVerified: { type: Boolean, default: false },
        /**
         * The one-time handle a federated callback put on this URL, for the
         * session it established (plan 094). It is redeemed AFTER mount, so
         * the resulting lastAuthOrigin change reaches the watch below and
         * the login counts as fresh: select_account then skips the chooser
         * (the account was chosen at the provider) and prompt=login does not
         * demand a second credential entry.
         */
        federatedLogin: { type: Object as PropType<{ handle: string, providerId: string }> },
    },
    emits: ['redirect', 'failed'],
    setup(props, { emit }) {
        const httpClient = injectHTTPClient();
        const store = injectStore();
        const {
            acr,
            loggedIn,
            lastAuthOrigin,
            realmId,
            user,
        } = storeToRefs(store);

        // Held true from the first render (SSR included) so the login form
        // never flashes while the handle is in flight.
        const federatedLoginPending = ref<boolean>(!!props.federatedLogin);

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
        // Second-factor requirement locally satisfied on THIS page (see the
        // MFA gate below) — declared up here so the fresh-login watch can
        // stamp it.
        const mfaSatisfiedLocal = ref<boolean>(false);

        watch(lastAuthOrigin, (value) => {
            if (value === StoreAuthOrigin.LOGIN) {
                accountConfirmedLocal.value = true;

                // A login whose grant already verified the second factor (the
                // inline `otp` step or the MFA-pending ticket completion,
                // issue #3242) carries acr urn:authup:mfa — its session is
                // mfa_at-stamped, so re-prompting the challenge here would be
                // a redundant second ceremony. Scoped to a fresh ON-PAGE login;
                // lingering/restored sessions keep the pre-consent challenge
                // (it also pre-empts acr step-up freshness).
                if (acr.value === OAuth2AuthenticationContextClass.MFA) {
                    mfaSatisfiedLocal.value = true;
                }
            }
        });

        const accountConfirmed = computed<boolean>(() => accountConfirmedLocal.value);

        // MFA gate (plan 049). The server POST /authorize backstop is
        // authoritative; this renders the interactive challenge / inline
        // enrollment so the code request can succeed. The proof is
        // session-bound (mfa_at) — the challenge endpoint stamps it — so
        // once satisfied on THIS page we proceed to consent.
        const mfaStatus = ref<UserAuthenticatorChallengeResponse | null>(null);
        const mfaResolving = ref<boolean>(false);

        const refreshMfaStatus = async () => {
            mfaResolving.value = true;
            try {
                mfaStatus.value = await httpClient.userAuthenticator.challenge();
            } catch {
                try {
                    // one retry before failing open — absorbs a transient blip
                    // without permanently disabling the client-side gate for the
                    // rest of this render lifecycle.
                    mfaStatus.value = await httpClient.userAuthenticator.challenge();
                } catch {
                    // an errored challenge lookup must not brick the ladder —
                    // the server backstop still gates the code issuance.
                    mfaStatus.value = {
                        required: false,
                        enrollmentRequired: false,
                        kinds: [],
                    };
                }
            } finally {
                mfaResolving.value = false;
            }
        };

        // A federated user holding a confirmed factor gets no bearer from the
        // redemption. The server answers `mfa_required` with the restricted
        // MFA-pending ticket, and the challenge below completes the login and
        // returns the grant, exactly as a password login does.
        const federatedTicket = ref<string | null>(null);

        /**
         * A redemption that failed is terminal for this render. The person
         * came back from an external provider, so continuing the ladder
         * against whatever session the cookies already hold would consent an
         * application into the WRONG account, silently for a builtIn client.
         */
        const federatedError = ref<string | null>(null);

        const loadTicketChallengeMaterial = async (ticket: string) => {
            try {
                const status = await httpClient.userAuthenticator.challenge({ authorizationHeader: { type: 'Bearer', token: ticket } });

                mfaStatus.value = {
                    required: true,
                    enrollmentRequired: false,
                    // the error's kinds stand unless this answer carries its
                    // own: an empty list would leave the form with nothing to
                    // render
                    kinds: status.kinds.length > 0 ?
                        status.kinds :
                        (mfaStatus.value?.kinds ?? []),
                    challenge: status.challenge,
                };
            } catch {
                // keep the kinds the error carried; only the webauthn material
                // is lost, and every other kind renders without it
            }
        };

        onMounted(async () => {
            const federated = props.federatedLogin;
            if (!federated) {
                return;
            }

            try {
                const grant = await httpClient.identityProvider.completeLogin(
                    federated.providerId,
                    federated.handle,
                    // minted by the login form before the hop and kept in this
                    // origin's session storage: the proof that THIS browser
                    // started the login the handle belongs to
                    consumeFederatedLoginChallenge() ?? '',
                );

                await store.loginWithTokenGrant(grant);
            } catch (e) {
                const ctx = extractErrorContext(e);
                const ticket = ctx.code === ErrorCode.OAUTH_MFA_REQUIRED &&
                    typeof ctx.data?.mfa_token === 'string' ?
                    ctx.data.mfa_token :
                    null;

                if (ticket) {
                    federatedTicket.value = ticket;
                    mfaStatus.value = {
                        required: true,
                        enrollmentRequired: false,
                        kinds: Array.isArray(ctx.data?.kinds) ?
                            ctx.data?.kinds as `${UserAuthenticatorKind}`[] :
                            [],
                    };

                    Promise.resolve().then(() => loadTicketChallengeMaterial(ticket));
                } else {
                    const message = ctx.message ??
                        (e instanceof Error ? e.message : String(e));

                    federatedError.value = message;
                    emit('failed', message);
                }
            } finally {
                federatedLoginPending.value = false;
            }
        });

        const loginFailedText = useTranslation({
            namespace: TranslatorTranslationNamespace.CLIENT,
            key: TranslatorTranslationClientKey.LOGIN_FAILED,
        });

        const completeFederatedTicket = async (
            response?: UserAuthenticatorChallengeVerifyResponse,
        ) => {
            if (!response || !response.token) {
                emit('failed', loginFailedText.value);
                return;
            }

            try {
                await store.loginWithTokenGrant(response.token);

                federatedTicket.value = null;
                mfaSatisfiedLocal.value = true;
            } catch (e) {
                emit('failed', extractErrorContext(e).message ??
                    (e instanceof Error ? e.message : String(e)));
            }
        };

        // Persisted-consent covering probe (plan 055). The subject's
        // per-scope consent rows for this client decide whether the manual
        // consent screen can be skipped (auto-consent) — computed client-side
        // from the self-scoped row list, mirroring the mfaStatus pattern:
        // null = probe pending (ladder shows a loading text), afterwards
        // { covered } is the settled decision. built_in clients never probe
        // (they keep zero rows and auto-consent regardless).
        const consentStatus = ref<null | { covered: boolean }>(null);

        const requestedScopeTokens = computed<string[]>(
            // Drop empty tokens exactly like the server's record/covering path
            // (a comma/whitespace-padded scope yields a '' element) — otherwise
            // the '' can never match a row and a recorded grant reads as
            // uncovered forever.
            () => unwrapOAuth2Scope(props.codeRequest?.scope ?? []).filter((token) => token.length > 0),
        );

        const refreshConsentStatus = async () => {
            // The probe (and auto-consent) only applies to a resolved USER
            // subject. The server force-scopes a permissionless caller to its
            // own rows, but an actor holding CONSENT_READ (admin / realm_admin)
            // would otherwise receive every subject's rows — so the request is
            // explicitly subject-filtered and the covering match re-checks
            // sub/subKind (defense in depth: never auto-consent off another
            // subject's grant).
            if (!props.client || props.client.builtIn) {
                consentStatus.value = { covered: false };
                return;
            }

            const subjectId = user.value?.id;
            if (!subjectId) {
                // No resolved user yet: stay pending (loading text) until the
                // session settles; a settled non-user session (client)
                // then falls through to manual consent — never auto-consent.
                if (userSettled.value) {
                    consentStatus.value = { covered: false };
                }
                return;
            }

            try {
                const { data } = await httpClient.consent.getMany({
                    filters: {
                        clientId: props.client.id,
                        sub: subjectId,
                        subKind: 'user',
                    },
                    pagination: { limit: 50 },
                });

                // Drop a response that is no longer current — a logout or
                // account switch that landed while the probe was in flight
                // must never latch a stale cross-account verdict.
                if (!loggedIn.value || user.value?.id !== subjectId) {
                    return;
                }

                const now = new Date().toISOString();
                const covered = requestedScopeTokens.value.length > 0 &&
                    requestedScopeTokens.value.every((token) => data.some(
                        (row) => row.scope === token &&
                            row.sub === subjectId &&
                            row.subKind === 'user' &&
                            (!row.expiresAt || row.expiresAt > now),
                    ));

                consentStatus.value = { covered };
            } catch {
                // probe failure → re-prompt (fail safe: never auto-consent on
                // an unknown covering state).
                if (!loggedIn.value || user.value?.id !== subjectId) {
                    return;
                }
                consentStatus.value = { covered: false };
            }
        };

        // Fetch once the identity is logged in (and refetch after a switch).
        watch(loggedIn, (value) => {
            if (value && !mfaStatus.value && !mfaResolving.value) {
                Promise.resolve().then(() => refreshMfaStatus());
            }
            if (!value) {
                mfaStatus.value = null;
                mfaSatisfiedLocal.value = false;
            }
        }, { immediate: true });

        const error = ref<Error | null>(null);
        const client = ref<Client | null>(null);

        // The chooser needs the resolved user for "Continue as X" — but
        // loggedIn/realmId are truthy for ANY identity (token introspection),
        // while the userinfo fetch fails for a non-user (client)
        // session, or transiently for a cookie-restored one. Re-resolve and
        // track settlement so the chooser can offer an escape hatch instead
        // of spinning forever on the loading text.
        const userSettled = ref<boolean>(!!user.value);
        if (!userSettled.value) {
            Promise.resolve()
                .then(() => store.resolve())
                .catch(() => {
                    // settled — user stays null, the chooser renders the
                    // account-switch escape hatch instead of the spinner.
                })
                .finally(() => {
                    userSettled.value = true;
                });
        }

        // The covering probe is driven by the resolved USER subject (not the
        // access-token-derived loggedIn, which flips before userInfo resolves)
        // and by the requested scopes — reset + refetch whenever the subject,
        // its settlement, or the code request changes, so the decision is
        // always computed for the current subject and never carried across an
        // account switch or a code-request change.
        watch(
            [loggedIn, () => user.value?.id, userSettled, () => props.codeRequest],
            () => {
                consentStatus.value = null;
                if (loggedIn.value) {
                    Promise.resolve().then(() => refreshConsentStatus());
                }
            },
            { immediate: true },
        );

        const loadingText = useTranslation({
            namespace: TranslatorTranslationNamespace.COMMON,
            key: TranslatorTranslationCommonKey.LOADING,
        });

        const reauthText = useTranslation({
            namespace: TranslatorTranslationNamespace.CLIENT,
            key: TranslatorTranslationClientKey.REAUTH_TEXT,
        });

        const consentStatusLoadingText = useTranslation({
            namespace: TranslatorTranslationNamespace.CLIENT,
            key: TranslatorTranslationClientKey.CONSENT_STATUS_LOADING,
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
                    client.value = (await httpClient.client.getOne(props.clientId)).data;
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

            // A federated return holds the WHOLE ladder, not just its
            // logged-out branch: a session already in the cookies (another
            // tab, a lingering one) would otherwise let the ladder run against
            // that identity while the redemption is still in flight, and a
            // builtIn client auto-consents on mount — delivering the
            // application a code for the wrong account.
            if (federatedLoginPending.value) {
                return wrapChild(h(AuthorizeText, { message: loadingText.value }));
            }

            if (federatedError.value) {
                return wrapChild(h(AuthorizeText, {
                    message: federatedError.value,
                    isError: true,
                }));
            }

            // The federated login owes a second factor: no bearer exists yet,
            // so the challenge runs against the restricted ticket and its
            // verify response carries the grant.
            if (federatedTicket.value) {
                return wrapChild(h(AMfaChallengeForm, {
                    kinds: mfaStatus.value?.kinds ?? [],
                    challenge: mfaStatus.value?.challenge ?? null,
                    ticket: federatedTicket.value,
                    onDone: (response?: UserAuthenticatorChallengeVerifyResponse) => {
                        completeFederatedTicket(response);
                    },
                    onFailed: (message: string) => emit('failed', message),
                }));
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
                    targetRealmName: props.realm?.displayName || props.realm?.name || '',
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
                    // Resolution still in flight — loading text is fine. Once
                    // settled with no user (a non-user identity, or a userinfo
                    // fetch that keeps failing), offer "use another account"
                    // (an empty identityName hides the continue action)
                    // instead of an indefinite spinner.
                    if (!userSettled.value) {
                        return wrapChild(h(AuthorizeText, { message: loadingText.value }));
                    }

                    return wrapChild(h(AAccountPrompt, {
                        identityName: '',
                        onSwitch: switchAccount,
                    }));
                }

                return wrapChild(h(AAccountPrompt, {
                    identityName: user.value.name ?? user.value.displayName ?? '',
                    onContinue: () => { accountConfirmedLocal.value = true; },
                    onSwitch: switchAccount,
                }));
            }

            // MFA gate (plan 049) — interactive only. A silent (prompt=none)
            // request can't render a challenge form; its AuthorizeForm
            // auto-consent hits the server backstop and redirects the OIDC
            // error (interaction_required), so skip the form here for silent.
            if (!isSilent && !mfaSatisfiedLocal.value) {
                // Block consent until the status is known — AuthorizeForm
                // auto-submits for built_in clients, so it must not render
                // before we know whether a factor is required.
                if (!mfaStatus.value) {
                    return wrapChild(h(AuthorizeText, { message: loadingText.value }));
                }

                if (mfaStatus.value.required) {
                    return wrapChild(h(AMfaChallengeForm, {
                        kinds: mfaStatus.value.kinds,
                        challenge: mfaStatus.value.challenge ?? null,
                        onDone: () => { mfaSatisfiedLocal.value = true; },
                        onFailed: (message: string) => emit('failed', message),
                    }));
                }

                // mfaRequired + no device → configure inline, then re-check
                // (the freshly enrolled device makes the next status.required).
                if (mfaStatus.value.enrollmentRequired) {
                    return wrapChild(h(AUserAuthenticatorEnroll, {
                        onDone: () => {
                            mfaStatus.value = null;
                            Promise.resolve().then(() => refreshMfaStatus());
                        },
                        onFailed: (e: unknown) => emit(
                            'failed',
                            e instanceof Error ? e.message : String(e),
                        ),
                    }));
                }
            }

            if (!client.value) {
                return [];
            }

            // Consent probe gate (plan 055) — block the consent decision until
            // the covering probe settles. Applies to logged-in users on
            // non-built_in clients only: built_in clients never depend on the
            // probe (today's auto-consent flow preserved exactly), and the
            // logged-out branches returned earlier. Silent requests must wait
            // here too, or they'd race to a false consent_required redirect.
            if (!client.value.builtIn && consentStatus.value === null) {
                return wrapChild(h(AuthorizeText, { message: consentStatusLoadingText.value }));
            }

            // A silent request against a non-built_in client can only proceed
            // when the persisted consent rows cover every requested scope —
            // otherwise consent_required.
            if (
                isSilent &&
                !client.value.builtIn &&
                consentStatus.value?.covered !== true
            ) {
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
                    identityName: user.value?.name ?? user.value?.displayName ?? '',
                    // abort()'s access_denied redirect is gated on the verified
                    // redirect_uri, like every other redirect in the ladder.
                    redirectUriVerified: props.redirectUriVerified,
                    // Persisted consent covers every requested scope →
                    // AuthorizeForm may auto-consent (unless prompt=consent).
                    consentGranted: consentStatus.value?.covered === true,
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
