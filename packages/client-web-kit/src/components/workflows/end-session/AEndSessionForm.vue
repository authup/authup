<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
/* global window */
import { IdentityType } from '@authup/core-kit';
import { TranslatorTranslationClientKey, TranslatorTranslationNamespace } from '@authup/i18n';
import { VCButton } from '@vuecs/button';
import { VCIcon } from '@vuecs/icon';
import { storeToRefs } from 'pinia';
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
        // The `sub` of the session revoked server-side (only set for a verified
        // hint). Local auto-cleanup is gated on it matching THIS browser's user.
        hintSub: {
            type: String,
            default: undefined,
        },
        // The `sub_kind` of the revoked session. The auto-cleanup gate below
        // compares hintSub against the local USER id, so a non-user subject
        // (client/robot) must never match — and a missing kind fails closed.
        hintSubKind: {
            type: String,
            default: undefined,
        },
        // A validated post_logout_redirect_uri (open-redirect guard already
        // applied server-side; carries `state`). Navigated to after sign-out.
        redirect: {
            type: String,
            default: undefined,
        },
    },
    setup(props) {
        const store = injectStore();
        const { user } = storeToRefs(store);
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

        const navigateToRedirect = (): boolean => {
            if (props.redirect && typeof window !== 'undefined') {
                window.location.href = props.redirect;
                return true;
            }

            return false;
        };

        // Always transition to a terminal state — a failed local cleanup must
        // not strand the user on the pre-logout UI (in the serverRevoked path
        // the server already ended the session). Navigate to a validated
        // post-logout redirect when present, else show the signed-out notice.
        const signOut = async () => {
            try {
                await store.logout();
            } finally {
                if (!navigateToRedirect()) {
                    done.value = true;
                }
            }
        };

        onMounted(async () => {
            // The server already ended the session (verified hint) — clear the
            // local token/cookie state, then show the terminal notice.
            //
            // Gate the auto-cleanup on the revoked subject being THIS browser's
            // user: without it, a cross-site GET to
            // /logout?id_token_hint=<attacker's own id_token> (which revokes the
            // attacker's own session, so serverRevoked is true) would forcibly
            // sign out an unrelated victim who merely renders this page — a
            // forced-logout CSRF. store.logout() is local-only, so it acts on
            // whoever's browser rendered the page, not on the hint's subject.
            //
            // The subject kind must be `user` too — hintSub is compared against
            // the local USER id, so a client/robot session's sub (a different
            // id namespace) matching a user id would be a confusion, not an
            // identity. A missing kind fails closed.
            if (
                props.serverRevoked &&
                props.hintSub &&
                props.hintSubKind === IdentityType.USER &&
                user.value &&
                props.hintSub === user.value.id
            ) {
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
