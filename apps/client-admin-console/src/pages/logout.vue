<script lang="ts">
/* global window */
import { buildEndSessionURL, injectStore } from '@authup/client-web-kit';
import { defineComponent, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { injectAdminConsoleConfig } from '../di';

export default defineComponent({
    setup() {
        // Deliberately NOT a requireLoggedOut route: that meta makes the
        // routing guard run store.logout() before this page's setup,
        // discarding the id_token needed for the round-trip. This page owns
        // the sign-out.
        const store = injectStore();
        const config = injectAdminConsoleConfig();
        const router = useRouter();

        onMounted(async () => {
            if (config.cookieSession) {
                // `logout()` ends the session over the wire (DELETE
                // /sessions/@me): the server drops the credential, revokes the
                // session and clears the cookie. There is no id_token in this
                // app's JavaScript to hint an RP-initiated logout with, and
                // after the delete there is no session left to end.
                await store.logout();
                await router.replace({ path: '/login' });

                return;
            }

            // Capture the hint + realm BEFORE the local cleanup clears them.
            const idTokenHint = store.idToken ?? undefined;
            const { realmId } = store;

            // Local token/cookie cleanup only (never a server session delete,
            // which collides with #3191 interactive-login session reuse).
            await store.logout();

            // Hand off to authup's RP-Initiated Logout endpoint so the shared
            // authup session is ended too. With the id_token hint the server
            // revokes and bounces straight back to post_logout_redirect_uri;
            // without it, the server's click-gated confirm page returns here.
            // Deliberately NO client_id: the server resolves the client from
            // the hint's sole aud.
            window.location.href = buildEndSessionURL({
                baseURL: config.apiUrl,
                idTokenHint,
                realmId,
                postLogoutRedirectUri: `${window.location.origin}${config.basePath}/login`,
            });
        });
    },
});
</script>
<template>
    <div class="mx-auto w-full max-w-screen-lg px-4 text-center">
        <span class="fa-solid fa-spinner fa-spin" />
    </div>
</template>
