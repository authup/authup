<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import type { DeviceAuthorizationInfo, UserAuthenticatorChallengeResponse } from '@authup/core-http-kit';
import { IDENTITY_PROVIDER_LOGIN_NOT_PENDING } from '@authup/core-http-kit';
import { isDeviceVerificationThrottledError } from '@authup/errors';
import {
    TranslatorTranslationActionKey,
    TranslatorTranslationClientKey,
    TranslatorTranslationCommonKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import { OAuth2ErrorCode, unwrapOAuth2Scope } from '@authup/specs';
import { VCButton } from '@vuecs/button';
import { VCAlert } from '@vuecs/elements';
import { VCFormGroup, VCFormInput, useSubmitButton } from '@vuecs/forms';
import { VCIcon } from '@vuecs/icon';
import type { LinkProps } from '@vuecs/link';
import { storeToRefs } from 'pinia';
import type { PropType } from 'vue';
import {
    computed,
    defineComponent,
    onMounted,
    ref,
} from 'vue';
import {
    StoreAuthStatus,
    extractErrorContext,
    injectHTTPClient,
    injectStore,
    useTranslation,
    useTranslations,
    wrapFnWithBusyState,
} from '../../../core';
import AUserAuthenticatorEnroll from '../../entities/user-authenticator/AUserAuthenticatorEnroll.vue';
import AuthorizeText from '../authorize/AuthorizeText.vue';
import LoginForm from '../login/LoginForm.vue';
import AMfaChallengeForm from '../mfa/AMfaChallengeForm.vue';

type Step = 'code' | 'login' | 'lookup' | 'realmMismatch' | 'mfa' | 'enroll' | 'confirm' | 'done';

type CodeError = 'invalid' | 'throttled';

const normalizeUserCode = (input: string) : string => input.toUpperCase().replace(/[^A-Z0-9]/g, '');

const USER_CODE_PATTERN = /^[BCDFGHJKLMNPQRSTVWXZ]{8}$/;

const formatUserCode = (input: string) : string => {
    const canonical = normalizeUserCode(input);

    return canonical.length > 4 ?
        `${canonical.slice(0, 4)}-${canonical.slice(4)}` :
        canonical;
};

export default defineComponent({
    components: {
        AMfaChallengeForm,
        AUserAuthenticatorEnroll,
        AuthorizeText,
        LoginForm,
        VCAlert,
        VCButton,
        VCFormGroup,
        VCFormInput,
        VCIcon,
    },
    props: {
        userCode: { type: String },
        /**
         * Set when the person came back from an external provider: the page
         * redeems the pending login before anything else (#3589).
         */
        federatedLogin: { type: Object as PropType<{ providerId: string }> },
        /**
         * A refusal marker the federated callback attached. Only
         * `access_denied` is mapped; anything else is ignored.
         */
        error: { type: String },
        registerLink: { type: Object as PropType<LinkProps> },
        passwordForgotLink: { type: Object as PropType<LinkProps> },
    },
    emits: ['done', 'failed'],
    setup(props, { emit }) {
        const httpClient = injectHTTPClient();
        const store = injectStore();
        const { status, user } = storeToRefs(store);

        const translations = useTranslations([
            { namespace: TranslatorTranslationNamespace.ACTION, key: TranslatorTranslationActionKey.ABORT },
            { namespace: TranslatorTranslationNamespace.ACTION, key: TranslatorTranslationActionKey.AUTHORIZE },
            { namespace: TranslatorTranslationNamespace.COMMON, key: TranslatorTranslationCommonKey.LOADING },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.DEVICE_VERIFY_TITLE },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.DEVICE_CODE_LABEL },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.DEVICE_CODE_HINT },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.DEVICE_CODE_INVALID },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.DEVICE_VERIFY_SCOPES },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.DEVICE_VERIFY_APPROVED },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.DEVICE_VERIFY_DENIED },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.DEVICE_VERIFY_THROTTLED },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_CONFIRM },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.REALM_MISMATCH_TITLE },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.USE_ANOTHER_ACCOUNT },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.NOT_YOU },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.ACCESS_DENIED_TITLE },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.ACCESS_DENIED_TEXT },
        ]);

        // A pending federated login is redeemed on mount, and the `lookup`
        // step is what renders the loading text while it runs.
        const step = ref<Step>(props.federatedLogin ? 'lookup' : 'code');
        const code = ref<string>(props.userCode ? formatUserCode(props.userCode) : '');
        const codeError = ref<CodeError | null>(null);
        const info = ref<DeviceAuthorizationInfo | null>(null);
        const mfaStatus = ref<UserAuthenticatorChallengeResponse | null>(null);
        const accessDenied = ref<boolean>(props.error === OAuth2ErrorCode.ACCESS_DENIED);
        if (accessDenied.value) {
            step.value = 'done';
        }
        const decision = ref<'approved' | 'denied' | null>(null);
        const busy = ref<boolean>(false);

        const canonical = computed<string>(() => normalizeUserCode(code.value));

        const clientName = computed<string>(() => info.value?.client.displayName || info.value?.client.name || '');
        const realmName = computed<string>(() => info.value?.realm.displayName || info.value?.realm.name || '');
        const identityName = computed<string>(() => user.value?.name ?? user.value?.displayName ?? '');
        const scopes = computed<string[]>(() => unwrapOAuth2Scope(info.value?.scope ?? '')
            .filter((token) => token.length > 0));

        const confirmText = useTranslation({
            namespace: TranslatorTranslationNamespace.CLIENT,
            key: TranslatorTranslationClientKey.DEVICE_VERIFY_CONFIRM_TEXT,
            data: { client: clientName },
        });

        const realmMismatchText = useTranslation({
            namespace: TranslatorTranslationNamespace.CLIENT,
            key: TranslatorTranslationClientKey.REALM_MISMATCH_TEXT,
            data: { client: clientName, realm: realmName },
        });

        const signedInAsLabel = useTranslation({
            namespace: TranslatorTranslationNamespace.CLIENT,
            key: TranslatorTranslationClientKey.SIGNED_IN_AS,
            data: { name: identityName },
        });

        const codeErrorText = computed<string | null>(() => {
            switch (codeError.value) {
                case 'invalid': return translations.deviceCodeInvalid;
                case 'throttled': return translations.deviceVerifyThrottled;
                default: return null;
            }
        });

        onMounted(async () => {
            const federated = props.federatedLogin;
            if (!federated || accessDenied.value) {
                return;
            }

            try {
                const grant = await httpClient.identityProvider.completeLogin(federated.providerId);

                await store.loginWithTokenGrant(grant);
            } catch (e) {
                const ctx = extractErrorContext(e);

                // The person's intent was the provider account, so a failed
                // redemption must leave no session to approve a device with.
                // Skipped when no completion was pending: the hint is a plain
                // query parameter, and logging out on it would make every
                // device link a one-click logout.
                if (ctx.data?.reason !== IDENTITY_PROVIDER_LOGIN_NOT_PENDING) {
                    await store.logout();
                }

                emit('failed', ctx.message ?? (e instanceof Error ? e.message : String(e)));
            } finally {
                // Never straight to the lookup: authorize-out is an anonymous
                // GET, so the code in the URL may be one the person never saw.
                // The code stays displayed and confirmed (RFC 8628 section
                // 3.3.1), and with the session established the confirm click
                // goes straight to the lookup.
                step.value = 'code';
            }
        });

        const refreshMfaStatus = async () => {
            try {
                mfaStatus.value = await httpClient.userAuthenticator.challenge();
            } catch {
                mfaStatus.value = null;
            }
        };

        const handleRefusal = async (e: unknown, fallback: Step) => {
            const ctx = extractErrorContext(e);

            if (isDeviceVerificationThrottledError(ctx.data)) {
                codeError.value = 'throttled';
                step.value = 'code';
                return;
            }

            switch (ctx.data?.error) {
                case OAuth2ErrorCode.INVALID_GRANT:
                    codeError.value = 'invalid';
                    step.value = 'code';
                    return;
                case OAuth2ErrorCode.LOGIN_REQUIRED:
                    step.value = 'realmMismatch';
                    return;
                case OAuth2ErrorCode.MFA_REQUIRED:
                    await refreshMfaStatus();
                    step.value = 'mfa';
                    return;
                case OAuth2ErrorCode.ACCESS_DENIED:
                    accessDenied.value = true;
                    step.value = 'done';
                    return;
                default:
                    step.value = fallback;
                    emit('failed', ctx.message ?? (e instanceof Error ? e.message : String(e)));
            }
        };

        const lookup = wrapFnWithBusyState(busy, async () => {
            step.value = 'lookup';
            info.value = null;

            try {
                info.value = await httpClient.deviceAuthorization.lookup({ user_code: canonical.value });
            } catch (e) {
                await handleRefusal(e, 'code');
                return;
            }

            await refreshMfaStatus();

            if (mfaStatus.value?.required) {
                step.value = 'mfa';
                return;
            }

            if (mfaStatus.value?.enrollmentRequired) {
                step.value = 'enroll';
                return;
            }

            step.value = 'confirm';
        });

        const submitCode = async () => {
            codeError.value = null;

            if (!canonical.value) {
                return;
            }

            if (!USER_CODE_PATTERN.test(canonical.value)) {
                codeError.value = 'invalid';
                return;
            }

            if (status.value !== StoreAuthStatus.AUTHENTICATED) {
                step.value = 'login';
                return;
            }

            await lookup();
        };

        const switchAccount = async () => {
            await store.logout();
            step.value = 'login';
        };

        const approve = wrapFnWithBusyState(busy, async () => {
            try {
                const response = await httpClient.deviceAuthorization.approve({ user_code: canonical.value });
                decision.value = response.status;
                step.value = 'done';
                emit('done', response.status);
            } catch (e) {
                await handleRefusal(e, 'confirm');
            }
        });

        const deny = wrapFnWithBusyState(busy, async () => {
            try {
                const response = await httpClient.deviceAuthorization.deny({ user_code: canonical.value });
                decision.value = response.status;
                step.value = 'done';
                emit('done', response.status);
            } catch (e) {
                await handleRefusal(e, 'confirm');
            }
        });

        const submitButton = useSubmitButton({
            loading: busy,
            disabled: computed(() => busy.value || !canonical.value),
        });

        return {
            translations,
            step,
            code,
            canonical,
            codeErrorText,
            info,
            mfaStatus,
            accessDenied,
            decision,
            busy,
            clientName,
            identityName,
            scopes,
            confirmText,
            realmMismatchText,
            signedInAsLabel,
            submitButton,
            submitCode,
            lookup,
            switchAccount,
            approve,
            deny,
        };
    },
});
</script>
<template>
    <form
        v-if="step === 'code'"
        @submit.prevent="submitCode"
    >
        <div class="text-center">
            <h1 class="font-bold">
                {{ translations.deviceVerifyTitle }}
            </h1>
        </div>

        <VCAlert
            v-if="codeErrorText"
            color="error"
            variant="soft"
            class="mb-3"
        >
            {{ codeErrorText }}
        </VCAlert>

        <VCFormGroup>
            <template #label>
                {{ translations.deviceCodeLabel }}
            </template>
            <VCFormInput
                v-model="code"
                autocomplete="off"
                autocapitalize="characters"
                autofocus
            />
            <template #hint>
                {{ translations.deviceCodeHint }}
            </template>
        </VCFormGroup>

        <VCButton
            v-bind="submitButton"
            :label="translations.mfaConfirm"
            class="w-full"
        />
    </form>
    <Suspense v-else-if="step === 'login'">
        <LoginForm
            :device-user-code="canonical"
            :register-link="registerLink"
            :password-forgot-link="passwordForgotLink"
            @done="lookup"
            @failed="(message: string) => $emit('failed', message)"
        />
        <template #fallback>
            <AuthorizeText :message="translations.loading" />
        </template>
    </Suspense>
    <AuthorizeText
        v-else-if="step === 'lookup'"
        :message="translations.loading"
    />
    <div
        v-else-if="step === 'realmMismatch'"
        class="flex flex-col gap-2"
    >
        <div class="text-center">
            <VCIcon
                name="fa6-solid:right-left"
                class="text-6xl text-info-600"
            />
        </div>
        <div class="text-center">
            <h1 class="font-bold">
                {{ translations.realmMismatchTitle }}
            </h1>
        </div>
        <div
            v-if="info"
            class="text-center fs-6 px-3"
        >
            {{ realmMismatchText }}
        </div>
        <VCButton
            type="button"
            color="primary"
            class="w-full mt-2"
            @click.prevent="switchAccount"
        >
            {{ translations.useAnotherAccount }}
        </VCButton>
    </div>
    <AMfaChallengeForm
        v-else-if="step === 'mfa'"
        :kinds="mfaStatus && mfaStatus.kinds.length > 0 ? mfaStatus.kinds : undefined"
        :challenge="mfaStatus?.challenge ?? null"
        @done="step = 'confirm'"
        @failed="(message: string) => $emit('failed', message)"
    />
    <AUserAuthenticatorEnroll
        v-else-if="step === 'enroll'"
        @done="step = 'confirm'"
        @failed="(e: unknown) => $emit('failed', e instanceof Error ? e.message : String(e))"
    />
    <div
        v-else-if="step === 'confirm' && info"
        class="flex flex-col gap-2"
    >
        <div class="text-center">
            <h5 class="text-fg-muted mb-1">
                {{ translations.deviceVerifyTitle }}
            </h5>
            <h1 class="font-bold">
                {{ clientName }}
            </h1>
        </div>

        <div class="text-center fs-6 px-3">
            {{ confirmText }}
        </div>

        <div v-if="scopes.length > 0">
            <div>{{ translations.deviceVerifyScopes }}</div>
            <div class="flex flex-col">
                <div
                    v-for="scope in scopes"
                    :key="scope"
                    class="flex flex-row gap-1"
                >
                    <div>
                        <VCIcon
                            name="fa6-solid:check"
                            class="text-success-600"
                        />
                    </div>
                    <div>
                        <strong>{{ scope }}</strong>
                    </div>
                </div>
            </div>
        </div>

        <div
            v-if="identityName"
            class="text-center"
        >
            <small class="text-fg-muted">
                {{ signedInAsLabel }}
                <button
                    type="button"
                    class="underline bg-transparent border-0 p-0 cursor-pointer text-inherit"
                    @click.prevent="switchAccount"
                >{{ translations.notYou }}</button>
            </small>
        </div>

        <div class="flex flex-wrap -mx-2">
            <div class="w-6/12 px-2">
                <VCButton
                    type="button"
                    color="neutral"
                    variant="soft"
                    class="w-full"
                    :disabled="busy"
                    @click.prevent="deny"
                >
                    {{ translations.abort }}
                </VCButton>
            </div>
            <div class="w-6/12 px-2">
                <VCButton
                    type="button"
                    color="primary"
                    class="w-full"
                    :disabled="busy"
                    @click.prevent="approve"
                >
                    {{ translations.authorize }}
                </VCButton>
            </div>
        </div>
    </div>
    <div
        v-else-if="step === 'done' && accessDenied"
        class="flex flex-col gap-2"
    >
        <div class="text-center">
            <h1 class="font-bold">
                {{ translations.accessDeniedTitle }}
            </h1>
        </div>
        <AuthorizeText
            :is-error="true"
            :message="translations.accessDeniedText"
        />
    </div>
    <AuthorizeText
        v-else-if="step === 'done'"
        :message="decision === 'approved' ? translations.deviceVerifyApproved : translations.deviceVerifyDenied"
    />
</template>
