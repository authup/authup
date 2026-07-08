<script lang="ts">
/* global window */
import { buildEndSessionURL, injectStore } from '@authup/client-web-kit';
import { defineNuxtComponent } from '#app';
import { definePageMeta, onMounted, useRuntimeConfig } from '#imports';

export default defineNuxtComponent({
    setup() {
        // Deliberately NOT REQUIRED_LOGGED_OUT: that meta makes the routing
        // interceptor run store.logout() before this page's setup, discarding
        // the id_token needed for the round-trip. This page owns the sign-out.
        definePageMeta({ layout: 'auth' });

        const store = injectStore();
        const runtimeConfig = useRuntimeConfig();

        // Client-only (onMounted never runs during SSR — window is available).
        onMounted(async () => {
            // Capture the hint + realm BEFORE the local cleanup clears them.
            const idTokenHint = store.idToken ?? undefined;
            const { realmId } = store;

            // Local token/cookie cleanup only (never a server session delete —
            // that collides with #3191 interactive-login session reuse).
            await store.logout();

            // Hand off to authup's RP-Initiated Logout endpoint so the shared
            // authup session is ended too. With the id_token hint the server
            // revokes and bounces straight back to post_logout_redirect_uri;
            // without it, the server's click-gated confirm page returns here.
            //
            // Deliberately NO client_id: the id_token's `aud` is the client's
            // UUID, so a name-identified client_id (`web`) would fail the
            // server's aud cross-check and clear hintVerified — disabling the
            // revoke. Omitting it lets the server resolve the client from the
            // hint's sole aud and keep the hint verified.
            window.location.href = buildEndSessionURL({
                baseURL: runtimeConfig.public.apiUrl as string,
                idTokenHint,
                realmId,
                postLogoutRedirectUri: `${window.location.origin}/login`,
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
