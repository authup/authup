<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
/* global window */
import type { EndSessionResponse } from '@authup/core-http-kit';
import { AAuthShell, AEndSessionForm, injectHTTPClient } from '@authup/client-web-kit';
import { defineComponent, onMounted, ref } from 'vue';

/**
 * The end-session call is driven from here (plan 101 D2).
 *
 * server-core's `/logout` keeps both of its OIDC browser bindings and
 * hands them over to this console, so the work happens when this page
 * asks for it. That is not a detour: `serverRevoked`, `hintSub` and
 * `hintSubKind` decide whether this browser's own session may be torn
 * down unattended, and they have to arrive as the answer to THIS page's
 * request. Carried in the URL they would be attacker-suppliable, and the
 * forced-logout CSRF gate inside AEndSessionForm would be deciding on
 * operands its attacker chose.
 *
 * The form renders only once the answer is in, so its own mounted gate
 * sees the real flags rather than a default. Nothing runs server-side:
 * a render must not end a session.
 */
export default defineComponent({
    components: {
        AAuthShell,
        AEndSessionForm,
    },
    setup() {
        const client = injectHTTPClient();

        const settled = ref(false);
        const result = ref<EndSessionResponse | undefined>(undefined);

        onMounted(async () => {
            if (typeof window === 'undefined') {
                return;
            }

            try {
                const params : Record<string, string> = {};
                new URL(window.location.href).searchParams.forEach((value, key) => {
                    params[key] = value;
                });

                const response = await client.post('logout', params);
                result.value = response.data;
            } catch {
                // A failed call must not strand the visitor: the form still
                // offers the click-gated sign-out, which is local and needs
                // nothing from the server.
            } finally {
                settled.value = true;
            }
        });

        return { settled, result };
    },
});
</script>
<template>
    <AAuthShell>
        <AEndSessionForm
            v-if="settled"
            :server-revoked="result?.serverRevoked"
            :hint-sub="result?.hintSub"
            :hint-sub-kind="result?.hintSubKind"
            :redirect="result?.redirect"
        />
    </AAuthShell>
</template>
