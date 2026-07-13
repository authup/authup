<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
/* global window */
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
import { VCButton } from '@vuecs/button';
import { VCAlert } from '@vuecs/elements';
import { VCFormGroup, VCFormInput } from '@vuecs/forms';
import { extractErrorContext, injectHTTPClient, useTranslations } from '../../../core';

export default defineComponent({
    components: {
        VCButton,
        VCAlert,
        VCFormGroup,
        VCFormInput,
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
    emits: ['done', 'failed'],
    setup(props, { emit }) {
        const apiClient = injectHTTPClient();

        const translations = useTranslations([
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_ENROLL_TITLE },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_ENROLL_TOTP },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_ENROLL_RECOVERY },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_ENROLL_EMAIL },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_SCAN_QR },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_MANUAL_KEY },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_CONFIRM_INTRO },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_CONFIRM },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_CODE },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_RECOVERY_INTRO },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_RECOVERY_SAVE },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_DOWNLOAD },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_SETUP_REQUIRED },
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

        const reset = () => {
            enrollment.value = null;
            enrollmentKind.value = null;
            confirmCode.value = '';
            error.value = null;
        };

        const enroll = async (kind: `${UserAuthenticatorKind}`) => {
            if (busy.value) {
                return;
            }

            busy.value = true;
            error.value = null;
            try {
                const response = await apiClient.userAuthenticator.enroll(props.userId, { kind });

                // email is confirmed on creation and has nothing to display —
                // just signal completion.
                if (kind === UserAuthenticatorKind.EMAIL) {
                    emit('done', response.entity);
                    return;
                }

                enrollment.value = response;
                enrollmentKind.value = kind;

                // recovery is confirmed on creation — the codes are shown once
                if (kind === UserAuthenticatorKind.RECOVERY) {
                    emit('done', response.entity);
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
                    enrollment.value.entity.id,
                    { code: confirmCode.value.trim() },
                );
                emit('done', entity);
                reset();
            } catch (e) {
                error.value = extractErrorContext(e).message ?? null;
                emit('failed', e);
            } finally {
                busy.value = false;
            }
        };

        const downloadRecoveryCodes = () => {
            if (typeof window === 'undefined' || !enrollment.value?.codes) {
                return;
            }

            const blob = new Blob([enrollment.value.codes.join('\n')], { type: 'text/plain' });
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
            enroll,
            confirm,
            reset,
            downloadRecoveryCodes,
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

        <!-- kind picker (unless an enrollment is in progress or a kind is forced) -->
        <template v-if="!enrollment">
            <p
                v-if="forcedKind"
                class="text-center mb-3"
            >
                {{ translations.mfaSetupRequired }}
            </p>

            <div class="flex flex-col gap-2">
                <VCButton
                    v-if="!forcedKind || forcedKind === UserAuthenticatorKind.TOTP"
                    :disabled="busy"
                    color="primary"
                    :label="translations.mfaEnrollTotp"
                    @click="enroll(UserAuthenticatorKind.TOTP)"
                />
                <VCButton
                    v-if="!forcedKind || forcedKind === UserAuthenticatorKind.EMAIL"
                    :disabled="busy"
                    color="neutral"
                    :label="translations.mfaEnrollEmail"
                    @click="enroll(UserAuthenticatorKind.EMAIL)"
                />
                <VCButton
                    v-if="!forcedKind || forcedKind === UserAuthenticatorKind.RECOVERY"
                    :disabled="busy"
                    color="neutral"
                    :label="translations.mfaEnrollRecovery"
                    @click="enroll(UserAuthenticatorKind.RECOVERY)"
                />
            </div>
        </template>

        <!-- TOTP: QR + manual key + confirm code -->
        <template v-else-if="enrollmentKind === UserAuthenticatorKind.TOTP">
            <p class="text-center">
                {{ translations.mfaScanQr }}
            </p>
            <div
                v-if="enrollment.qr"
                class="flex justify-center my-3"
            >
                <img
                    :src="enrollment.qr"
                    alt="QR"
                    class="max-w-[200px]"
                >
            </div>
            <p class="text-center text-sm">
                {{ translations.mfaManualKey }}
            </p>
            <p class="text-center font-mono break-all mb-3">
                {{ enrollment.secret }}
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
                    v-for="(code, index) in enrollment.codes"
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
                    @click="reset"
                />
            </div>
        </template>
    </div>
</template>
