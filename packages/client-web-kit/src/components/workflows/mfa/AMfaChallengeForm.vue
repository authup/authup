<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { UserAuthenticatorKind } from '@authup/core-kit';
import type { PropType } from 'vue';
import {
    computed,
    defineComponent,
    ref,
} from 'vue';
import {
    TranslatorTranslationClientKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import { startAuthentication } from '@simplewebauthn/browser';
import type { PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/browser';
import { VCButton } from '@vuecs/button';
import { VCAlert } from '@vuecs/elements';
import { VCFormGroup, VCFormInput } from '@vuecs/forms';
import type { UserAuthenticatorChallengeRequestOptions } from '@authup/core-http-kit';
import { extractErrorContext, injectHTTPClient, useTranslations } from '../../../core';

// preference order for the initially-selected factor (most secure first)
const KIND_PRIORITY : `${UserAuthenticatorKind}`[] = [
    UserAuthenticatorKind.WEBAUTHN,
    UserAuthenticatorKind.TOTP,
    UserAuthenticatorKind.EMAIL,
    UserAuthenticatorKind.RECOVERY,
];

export default defineComponent({
    components: {
        VCButton,
        VCAlert,
        VCFormGroup,
        VCFormInput,
    },
    props: {
        kinds: {
            type: Array as PropType<`${UserAuthenticatorKind}`[]>,
            default: () => [UserAuthenticatorKind.TOTP],
        },
        // kind-specific challenge payload from GET /authenticators/challenge
        // (WebAuthn request options under `.webauthn`).
        challenge: {
            type: Object as PropType<Record<string, unknown> | null>,
            default: null,
        },
        // MFA-pending login ticket (issue #3242) — a fresh interactive login
        // has no session bearer yet, so the challenge calls ride the ticket
        // as an explicit Authorization override. On success the verify
        // response carries the full token grant (forwarded via `done`).
        ticket: {
            type: String as PropType<string | null>,
            default: null,
        },
    },
    emits: ['done', 'failed'],
    setup(props, { emit }) {
        const apiClient = injectHTTPClient();

        const requestOptions = computed<UserAuthenticatorChallengeRequestOptions | undefined>(() => (props.ticket ?
            { authorizationHeader: { type: 'Bearer', token: props.ticket } } :
            undefined));

        const translations = useTranslations([
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_TITLE },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_CHALLENGE_INTRO },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_CODE },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_VERIFY },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_USE_RECOVERY },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_USE_AUTHENTICATOR },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_USE_EMAIL },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_USE_PASSKEY },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_PASSKEY_PROMPT },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_RECOVERY_CODE },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_FAILED },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_SEND_CODE },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_CODE_SENT },
        ]);

        const kind = ref<`${UserAuthenticatorKind}`>(
            KIND_PRIORITY.find((candidate) => props.kinds.includes(candidate)) ?? UserAuthenticatorKind.TOTP,
        );

        // the other kinds the user can switch to
        const alternatives = computed(
            () => props.kinds.filter((candidate) => candidate !== kind.value),
        );

        const isEmail = computed(() => kind.value === UserAuthenticatorKind.EMAIL);
        const isRecovery = computed(() => kind.value === UserAuthenticatorKind.RECOVERY);
        const isWebauthn = computed(() => kind.value === UserAuthenticatorKind.WEBAUTHN);

        const code = ref('');
        const busy = ref(false);
        const error = ref<string | null>(null);
        const emailSent = ref(false);

        const codeLabel = computed(() => (
            isRecovery.value ? translations.mfaRecoveryCode : translations.mfaCode
        ));

        const switchLabel = (target: `${UserAuthenticatorKind}`): string => {
            switch (target) {
                case UserAuthenticatorKind.RECOVERY: return translations.mfaUseRecovery;
                case UserAuthenticatorKind.EMAIL: return translations.mfaUseEmail;
                case UserAuthenticatorKind.WEBAUTHN: return translations.mfaUsePasskey;
                default: return translations.mfaUseAuthenticator;
            }
        };

        const switchKind = (target: `${UserAuthenticatorKind}`) => {
            kind.value = target;
            code.value = '';
            error.value = null;
            emailSent.value = false;
        };

        const sendEmailCode = async () => {
            if (busy.value) {
                return;
            }

            busy.value = true;
            error.value = null;
            try {
                await apiClient.userAuthenticator.sendChallenge(
                    { kind: UserAuthenticatorKind.EMAIL },
                    requestOptions.value,
                );
                emailSent.value = true;
            } catch (e) {
                error.value = extractErrorContext(e).message ?? translations.mfaFailed;
                emit('failed', e);
            } finally {
                busy.value = false;
            }
        };

        const submit = async () => {
            if (busy.value || !code.value.trim()) {
                return;
            }

            busy.value = true;
            error.value = null;
            try {
                const response = await apiClient.userAuthenticator.verifyChallenge(
                    {
                        kind: kind.value,
                        response: code.value.trim(),
                    },
                    requestOptions.value,
                );
                emit('done', response);
            } catch (e) {
                error.value = extractErrorContext(e).message ?? translations.mfaFailed;
                emit('failed', e);
            } finally {
                busy.value = false;
            }
        };

        const authenticateWithPasskey = async () => {
            // The challenge payload is an opaque Record on the wire (the server
            // keeps @simplewebauthn types out of the HTTP DTO); narrow it back to
            // the browser API's option shape at this single boundary.
            const optionsJSON = (props.challenge?.webauthn ?? null) as
                unknown as PublicKeyCredentialRequestOptionsJSON | null;
            if (busy.value || !optionsJSON) {
                return;
            }

            busy.value = true;
            error.value = null;
            try {
                const assertion = await startAuthentication({ optionsJSON });
                const response = await apiClient.userAuthenticator.verifyChallenge(
                    {
                        kind: UserAuthenticatorKind.WEBAUTHN,
                        response: JSON.stringify(assertion),
                    },
                    requestOptions.value,
                );
                emit('done', response);
            } catch (e) {
                error.value = extractErrorContext(e).message ?? translations.mfaFailed;
                emit('failed', error.value);
            } finally {
                busy.value = false;
            }
        };

        return {
            UserAuthenticatorKind,
            translations,
            kind,
            alternatives,
            isEmail,
            isWebauthn,
            code,
            codeLabel,
            busy,
            error,
            emailSent,
            switchLabel,
            switchKind,
            sendEmailCode,
            submit,
            authenticateWithPasskey,
        };
    },
});
</script>
<template>
    <div>
        <div class="text-center">
            <h1 class="font-bold">
                {{ translations.mfaTitle }}
            </h1>
        </div>

        <VCAlert
            v-if="error"
            color="error"
            variant="soft"
            class="mb-3"
        >
            {{ error }}
        </VCAlert>

        <!-- webauthn: a single passkey ceremony button -->
        <div v-if="isWebauthn">
            <p class="text-center mb-3">
                {{ translations.mfaPasskeyPrompt }}
            </p>
            <VCButton
                :disabled="busy || !challenge?.webauthn"
                :busy="busy"
                color="primary"
                :label="translations.mfaUsePasskey"
                class="w-full"
                @click="authenticateWithPasskey"
            />
        </div>

        <!-- email: request a code first -->
        <div v-else-if="isEmail && !emailSent">
            <p class="text-center mb-3">
                {{ translations.mfaChallengeIntro }}
            </p>
            <VCButton
                :disabled="busy"
                :busy="busy"
                color="primary"
                :label="translations.mfaSendCode"
                class="w-full"
                @click="sendEmailCode"
            />
        </div>

        <form
            v-else
            @submit.prevent="submit"
        >
            <p class="text-center mb-3">
                {{ isEmail ? translations.mfaCodeSent : translations.mfaChallengeIntro }}
            </p>

            <VCFormGroup>
                <template #label>
                    {{ codeLabel }}
                </template>
                <VCFormInput
                    v-model="code"
                    autocomplete="one-time-code"
                    autofocus
                />
            </VCFormGroup>

            <VCButton
                :disabled="busy || !code.trim()"
                :busy="busy"
                color="primary"
                :label="translations.mfaVerify"
                class="w-full"
                @click="submit"
            />

            <!-- email: allow requesting a fresh code (a delayed/expired one
                 otherwise dead-ends the flow); the server enforces a cooldown. -->
            <div
                v-if="isEmail"
                class="text-center mt-3"
            >
                <button
                    type="button"
                    class="a-auth-link"
                    :disabled="busy"
                    @click="sendEmailCode"
                >
                    {{ translations.mfaSendCode }}
                </button>
            </div>
        </form>

        <div
            v-if="alternatives.length > 0"
            class="text-center mt-3 flex flex-col gap-1"
        >
            <button
                v-for="alternative in alternatives"
                :key="alternative"
                type="button"
                class="a-auth-link"
                @click="switchKind(alternative)"
            >
                {{ switchLabel(alternative) }}
            </button>
        </div>
    </div>
</template>
