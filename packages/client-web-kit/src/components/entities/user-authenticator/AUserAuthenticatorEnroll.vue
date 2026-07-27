<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
/* global window */
import type { UserAuthenticator } from '@authup/core-kit';
import { UserAuthenticatorKind } from '@authup/core-kit';
import type { UserAuthenticatorEnrollResponse } from '@authup/core-http-kit';
import {
    computed,
    defineComponent,
    ref,
} from 'vue';
import {
    TranslatorTranslationActionKey,
    TranslatorTranslationClientKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import { startRegistration } from '@simplewebauthn/browser';
import type { PublicKeyCredentialCreationOptionsJSON } from '@simplewebauthn/browser';
import { VCButton } from '@vuecs/button';
import { VCAlert } from '@vuecs/elements';
import { VCFormGroup, VCFormInput } from '@vuecs/forms';
import { VCIcon } from '@vuecs/icon';
import { extractErrorContext, injectHTTPClient, useTranslations } from '../../../core';
import { USER_AUTHENTICATOR_KIND_ICONS } from './constants';

export default defineComponent({
    components: {
        VCButton,
        VCAlert,
        VCFormGroup,
        VCFormInput,
        VCIcon,
    },
    props: {
        // resolves `@me` for the calling user; an admin passes a user id.
        userId: {
            type: String,
            default: '@me',
        },
        // constrain enrollment to a single kind (inline authorize flow
        // forces `totp`); omit to let the user pick.
        kind: {
            type: String,
            default: null,
        },
    },
    emits: ['done', 'failed', 'closed'],
    setup(props, { emit }) {
        const apiClient = injectHTTPClient();

        const translations = useTranslations([
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_ENROLL_TITLE },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_ENROLL_TOTP },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_ENROLL_RECOVERY },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_ENROLL_EMAIL },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_ENROLL_WEBAUTHN },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_SCAN_QR },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_MANUAL_KEY },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_CONFIRM_INTRO },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_CONFIRM },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_CODE },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_RECOVERY_INTRO },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_RECOVERY_SAVE },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_DOWNLOAD },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_SETUP_REQUIRED },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_RECOVERY_NUDGE },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_RECOVERY_NUDGE_GENERATE },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_RECOVERY_NUDGE_SKIP },
            { namespace: TranslatorTranslationNamespace.ACTION, key: TranslatorTranslationActionKey.ABORT },
            { namespace: TranslatorTranslationNamespace.ACTION, key: TranslatorTranslationActionKey.CLOSE },
        ]);

        const busy = ref(false);
        const error = ref<string | null>(null);

        // enroll response (unconfirmed TOTP → show QR + confirm; recovery → show codes)
        const enrollment = ref<UserAuthenticatorEnrollResponse | null>(null);
        const enrollmentKind = ref<`${UserAuthenticatorKind}` | null>(null);
        const confirmCode = ref('');

        const forcedKind = computed<`${UserAuthenticatorKind}` | null>(
            () => (props.kind as `${UserAuthenticatorKind}` | null),
        );

        // Only email can be provisioned FOR another user — totp/recovery/webauthn
        // are owner-controlled (self-enrollment only) and the server rejects them
        // on a non-self target, so an admin managing a different user is offered
        // email alone (they reset the rest by deleting the user's devices).
        const managingOther = computed<boolean>(() => props.userId !== '@me');
        const canOfferKind = (kind: `${UserAuthenticatorKind}`): boolean => {
            if (forcedKind.value && forcedKind.value !== kind) {
                return false;
            }
            if (managingOther.value && kind !== UserAuthenticatorKind.EMAIL) {
                return false;
            }
            return true;
        };

        const methods = computed(() => [
            {
                kind: UserAuthenticatorKind.TOTP,
                icon: USER_AUTHENTICATOR_KIND_ICONS[UserAuthenticatorKind.TOTP],
                label: translations.mfaEnrollTotp,
            },
            {
                kind: UserAuthenticatorKind.WEBAUTHN,
                icon: USER_AUTHENTICATOR_KIND_ICONS[UserAuthenticatorKind.WEBAUTHN],
                label: translations.mfaEnrollWebauthn,
            },
            {
                kind: UserAuthenticatorKind.EMAIL,
                icon: USER_AUTHENTICATOR_KIND_ICONS[UserAuthenticatorKind.EMAIL],
                label: translations.mfaEnrollEmail,
            },
            {
                kind: UserAuthenticatorKind.RECOVERY,
                icon: USER_AUTHENTICATOR_KIND_ICONS[UserAuthenticatorKind.RECOVERY],
                label: translations.mfaEnrollRecovery,
            },
        ].filter((item) => canOfferKind(item.kind)));

        const reset = () => {
            enrollment.value = null;
            enrollmentKind.value = null;
            confirmCode.value = '';
            error.value = null;
        };

        // Soft recovery-code nudge (issue #3242 follow-up): a just-enrolled
        // email/webauthn factor without backup recovery codes leaves the
        // account one lost mailbox / authenticator away from a locked-out
        // login — offer (never force) generating codes before finishing.
        // While set, it holds the enrolled entity whose `done` emit is
        // DEFERRED until the nudge resolves (skip, or codes acknowledged) —
        // the authorize ladder re-renders on `done`, which would otherwise
        // unmount the nudge (and the displayed codes) immediately.
        const recoveryNudge = ref<UserAuthenticator | null>(null);

        const finishEnrollment = async (entity: UserAuthenticator, kind: `${UserAuthenticatorKind}`) => {
            if (
                managingOther.value ||
                (
                    kind !== UserAuthenticatorKind.EMAIL &&
                    kind !== UserAuthenticatorKind.WEBAUTHN
                )
            ) {
                emit('done', entity);
                return;
            }

            try {
                const { meta } = await apiClient.userAuthenticator.getMany(props.userId, {
                    filters: { kind: UserAuthenticatorKind.RECOVERY },
                    pagination: { limit: 1 },
                });
                if (meta.total > 0) {
                    emit('done', entity);
                    return;
                }
            } catch {
                // fail open — never block a completed enrollment on the nudge
                emit('done', entity);
                return;
            }

            recoveryNudge.value = entity;
        };

        const skipRecoveryNudge = () => {
            if (!recoveryNudge.value) {
                return;
            }

            const entity = recoveryNudge.value;
            recoveryNudge.value = null;
            emit('done', entity);
        };

        const generateRecoveryCodes = async () => {
            if (busy.value) {
                return;
            }

            busy.value = true;
            error.value = null;
            try {
                // deliberately NOT enroll(): the nudge defers every `done`
                // until the codes were acknowledged (close), so the parent
                // cannot re-render the shown-once codes away.
                const response = await apiClient.userAuthenticator.enroll(props.userId, { kind: UserAuthenticatorKind.RECOVERY });

                enrollment.value = response;
                enrollmentKind.value = UserAuthenticatorKind.RECOVERY;
            } catch (e) {
                error.value = extractErrorContext(e).message ?? null;
            } finally {
                busy.value = false;
            }
        };

        // terminal dismissal of the shown-once recovery codes — resolves a
        // deferred nudge `done` and lets a host (modal, wizard step) tear
        // the enrollment surface down via `closed`.
        const closeRecoveryCodes = () => {
            reset();

            if (recoveryNudge.value) {
                const entity = recoveryNudge.value;
                recoveryNudge.value = null;
                emit('done', entity);
            }

            emit('closed');
        };

        const enroll = async (kind: `${UserAuthenticatorKind}`) => {
            if (busy.value) {
                return;
            }

            busy.value = true;
            error.value = null;
            try {
                const response = await apiClient.userAuthenticator.enroll(props.userId, { kind });

                // webauthn: run the registration ceremony immediately and
                // confirm with the attestation (no display).
                if (kind === UserAuthenticatorKind.WEBAUTHN) {
                    if (!response.meta.webauthn) {
                        throw new Error('The server did not return WebAuthn registration options.');
                    }
                    // the http-kit response type is intentionally framework-agnostic
                    // (Record<string, unknown>); assert the browser lib's shape here.
                    const optionsJSON = response.meta.webauthn as unknown as PublicKeyCredentialCreationOptionsJSON;
                    const attestation = await startRegistration({ optionsJSON });
                    const confirmed = await apiClient.userAuthenticator.confirm(
                        props.userId,
                        response.data.id,
                        { code: JSON.stringify(attestation) },
                    );
                    await finishEnrollment(confirmed.data, kind);
                    return;
                }

                // email is confirmed on creation and has nothing to display —
                // just signal completion (via the recovery nudge).
                if (kind === UserAuthenticatorKind.EMAIL) {
                    await finishEnrollment(response.data, kind);
                    return;
                }

                enrollment.value = response;
                enrollmentKind.value = kind;

                // recovery is confirmed on creation — the codes are shown once
                if (kind === UserAuthenticatorKind.RECOVERY) {
                    emit('done', response.data);
                }
            } catch (e) {
                error.value = extractErrorContext(e).message ?? null;
                emit('failed', e);
            } finally {
                busy.value = false;
            }
        };

        const confirm = async () => {
            if (busy.value || !enrollment.value || !confirmCode.value.trim()) {
                return;
            }

            busy.value = true;
            error.value = null;
            try {
                const entity = await apiClient.userAuthenticator.confirm(
                    props.userId,
                    enrollment.value.data.id,
                    { code: confirmCode.value.trim() },
                );
                emit('done', entity.data);
                reset();
            } catch (e) {
                error.value = extractErrorContext(e).message ?? null;
                emit('failed', e);
            } finally {
                busy.value = false;
            }
        };

        const downloadRecoveryCodes = () => {
            if (typeof window === 'undefined' || !enrollment.value?.meta.codes) {
                return;
            }

            const blob = new Blob([enrollment.value.meta.codes.join('\n')], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const anchor = window.document.createElement('a');
            anchor.href = url;
            anchor.download = 'authup-recovery-codes.txt';
            anchor.click();
            window.URL.revokeObjectURL(url);
        };

        return {
            UserAuthenticatorKind,
            translations,
            busy,
            error,
            enrollment,
            enrollmentKind,
            confirmCode,
            forcedKind,
            methods,
            enroll,
            confirm,
            reset,
            downloadRecoveryCodes,
            recoveryNudge,
            skipRecoveryNudge,
            generateRecoveryCodes,
            closeRecoveryCodes,
        };
    },
});
</script>
<template>
    <div>
        <VCAlert
            v-if="error"
            color="error"
            variant="soft"
            class="mb-3"
        >
            {{ error }}
        </VCAlert>

        <!-- recovery-code nudge after an email/webauthn enrollment -->
        <template v-if="recoveryNudge && !enrollment">
            <VCAlert
                color="warning"
                variant="soft"
                class="mb-3"
            >
                {{ translations.mfaRecoveryNudge }}
            </VCAlert>
            <div class="flex gap-2">
                <VCButton
                    :disabled="busy"
                    :busy="busy"
                    color="primary"
                    :label="translations.mfaRecoveryNudgeGenerate"
                    @click="generateRecoveryCodes"
                />
                <VCButton
                    :disabled="busy"
                    color="neutral"
                    :label="translations.mfaRecoveryNudgeSkip"
                    @click="skipRecoveryNudge"
                />
            </div>
        </template>

        <!-- kind picker (unless an enrollment is in progress or a kind is forced) -->
        <template v-else-if="!enrollment">
            <p
                v-if="forcedKind"
                class="text-center mb-3"
            >
                {{ translations.mfaSetupRequired }}
            </p>

            <div class="flex flex-row gap-2 flex-wrap">
                <button
                    v-for="method in methods"
                    :key="method.kind"
                    type="button"
                    class="flex flex-col justify-center gap-1 text-center a-picker-item disabled:opacity-60"
                    :disabled="busy"
                    @click="enroll(method.kind)"
                >
                    <div>
                        <VCIcon
                            class="text-2xl"
                            :name="method.icon"
                        />
                    </div>
                    <div>
                        {{ method.label }}
                    </div>
                </button>
            </div>
        </template>

        <!-- TOTP: QR + manual key + confirm code -->
        <template v-else-if="enrollmentKind === UserAuthenticatorKind.TOTP">
            <p class="text-center">
                {{ translations.mfaScanQr }}
            </p>
            <div
                v-if="enrollment.meta.qr"
                class="flex justify-center my-3"
            >
                <img
                    :src="enrollment.meta.qr"
                    alt="QR"
                    class="max-w-[200px]"
                >
            </div>
            <p class="text-center text-sm">
                {{ translations.mfaManualKey }}
            </p>
            <p class="text-center font-mono break-all mb-3">
                {{ enrollment.meta.secret }}
            </p>

            <form @submit.prevent="confirm">
                <p class="mb-2">
                    {{ translations.mfaConfirmIntro }}
                </p>
                <VCFormGroup>
                    <template #label>
                        {{ translations.mfaCode }}
                    </template>
                    <VCFormInput
                        v-model="confirmCode"
                        autocomplete="one-time-code"
                    />
                </VCFormGroup>
                <div class="flex gap-2">
                    <VCButton
                        :disabled="busy || !confirmCode.trim()"
                        :busy="busy"
                        color="primary"
                        :label="translations.mfaConfirm"
                        @click="confirm"
                    />
                    <VCButton
                        :disabled="busy"
                        color="neutral"
                        :label="translations.abort"
                        @click="reset"
                    />
                </div>
            </form>
        </template>

        <!-- recovery: show the codes once -->
        <template v-else>
            <VCAlert
                color="warning"
                variant="soft"
                class="mb-3"
            >
                {{ translations.mfaRecoverySave }}
            </VCAlert>
            <p>{{ translations.mfaRecoveryIntro }}</p>
            <ul class="font-mono my-3 grid grid-cols-2 gap-1">
                <li
                    v-for="(code, index) in enrollment.meta.codes"
                    :key="index"
                >
                    {{ code }}
                </li>
            </ul>
            <div class="flex gap-2">
                <VCButton
                    color="primary"
                    :label="translations.mfaDownload"
                    @click="downloadRecoveryCodes"
                />
                <VCButton
                    color="neutral"
                    :label="translations.close"
                    @click="closeRecoveryCodes"
                />
            </div>
        </template>
    </div>
</template>
