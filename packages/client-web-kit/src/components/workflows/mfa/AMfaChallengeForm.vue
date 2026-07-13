<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import type { UserAuthenticatorKind } from '@authup/core-kit';
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
        kinds: {
            type: Array as PropType<`${UserAuthenticatorKind}`[]>,
            default: () => ['totp'],
        },
    },
    emits: ['done', 'failed'],
    setup(props, { emit }) {
        const apiClient = injectHTTPClient();

        const translations = useTranslations([
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_TITLE },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_CHALLENGE_INTRO },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_CODE },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_CODE_HINT },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_VERIFY },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_USE_RECOVERY },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_USE_AUTHENTICATOR },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_RECOVERY_CODE },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_FAILED },
        ]);

        const hasRecovery = computed(() => props.kinds.includes('recovery'));

        const useRecovery = ref(false);
        const kind = computed<`${UserAuthenticatorKind}`>(() => (useRecovery.value ? 'recovery' : 'totp'));

        const code = ref('');
        const busy = ref(false);
        const error = ref<string | null>(null);

        const submit = async () => {
            if (busy.value || !code.value.trim()) {
                return;
            }

            busy.value = true;
            error.value = null;
            try {
                await apiClient.userAuthenticator.verifyChallenge({
                    kind: kind.value,
                    response: code.value.trim(),
                });
                emit('done');
            } catch (e) {
                const { message } = extractErrorContext(e);
                error.value = message ?? translations.mfaFailed;
                emit('failed', error.value);
            } finally {
                busy.value = false;
            }
        };

        const toggleRecovery = () => {
            useRecovery.value = !useRecovery.value;
            code.value = '';
            error.value = null;
        };

        return {
            translations,
            hasRecovery,
            useRecovery,
            code,
            busy,
            error,
            submit,
            toggleRecovery,
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

        <form @submit.prevent="submit">
            <VCAlert
                v-if="error"
                color="error"
                variant="soft"
                class="mb-3"
            >
                {{ error }}
            </VCAlert>

            <p class="text-center mb-3">
                {{ translations.mfaChallengeIntro }}
            </p>

            <VCFormGroup>
                <template #label>
                    {{ useRecovery ? translations.mfaRecoveryCode : translations.mfaCode }}
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
        </form>

        <div
            v-if="hasRecovery"
            class="text-center mt-3"
        >
            <button
                type="button"
                class="a-auth-link"
                @click="toggleRecovery"
            >
                {{ useRecovery ? translations.mfaUseAuthenticator : translations.mfaUseRecovery }}
            </button>
        </div>
    </div>
</template>
