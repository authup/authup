<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { TranslatorTranslationClientKey, TranslatorTranslationNamespace } from '@authup/i18n';
import { VCButton } from '@vuecs/button';
import { VCIcon } from '@vuecs/icon';
import {
    defineComponent,
    onMounted,
    ref,
} from 'vue';
import { injectStore, useTranslation } from '../../../core';

export default defineComponent({
    components: { VCButton, VCIcon },
    props: {
        // A signature-verified id_token_hint already revoked the session
        // server-side — this page just clears local state and confirms.
        serverRevoked: {
            type: Boolean,
            default: false,
        },
    },
    setup(props) {
        const store = injectStore();
        const done = ref<boolean>(false);

        const title = useTranslation({
            namespace: TranslatorTranslationNamespace.CLIENT,
            key: TranslatorTranslationClientKey.LOGOUT_CONFIRM_TITLE,
        });
        const text = useTranslation({
            namespace: TranslatorTranslationNamespace.CLIENT,
            key: TranslatorTranslationClientKey.LOGOUT_CONFIRM_TEXT,
        });
        const doneText = useTranslation({
            namespace: TranslatorTranslationNamespace.CLIENT,
            key: TranslatorTranslationClientKey.LOGOUT_DONE,
        });
        const signOutLabel = useTranslation({
            namespace: TranslatorTranslationNamespace.CLIENT,
            key: TranslatorTranslationClientKey.SIGN_OUT,
        });

        // Always transition to the terminal state — a failed local cleanup must
        // not strand the user on the pre-logout UI (in the serverRevoked path
        // the server already ended the session).
        const signOut = async () => {
            try {
                await store.logout();
            } finally {
                done.value = true;
            }
        };

        onMounted(async () => {
            // The server already ended the session (verified hint) — clear the
            // local token/cookie state, then show the terminal notice (await so
            // "done" isn't shown while local cleanup is still in flight).
            if (props.serverRevoked) {
                await signOut();
            }
        });

        return {
            done,
            title,
            text,
            doneText,
            signOutLabel,
            signOut,
        };
    },
});
</script>
<template>
    <div class="flex flex-col gap-2">
        <div class="text-center">
            <VCIcon
                :name="done ? 'fa6-solid:circle-check' : 'fa6-solid:right-from-bracket'"
                class="text-6xl"
                :class="done ? 'text-success-600' : 'text-info-600'"
            />
        </div>

        <template v-if="done">
            <div class="text-center fs-6 p-3">
                {{ doneText }}
            </div>
        </template>
        <template v-else>
            <div class="text-center">
                <h1 class="font-bold">
                    {{ title }}
                </h1>
            </div>
            <div class="text-center fs-6 px-3">
                {{ text }}
            </div>
            <div class="mt-2">
                <VCButton
                    type="button"
                    color="primary"
                    class="w-full"
                    @click.prevent="signOut"
                >
                    {{ signOutLabel }}
                </VCButton>
            </div>
        </template>
    </div>
</template>
