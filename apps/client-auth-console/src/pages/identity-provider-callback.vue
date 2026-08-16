<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
/* global window */
import { AAuthShell, useTranslation } from '@authup/client-web-kit';
import { TranslatorTranslationClientKey, TranslatorTranslationNamespace } from '@authup/i18n';
import { VCButton } from '@vuecs/button';
import { computed, defineComponent, onMounted } from 'vue';
import { injectPayload } from '../di';

/**
 * Interstitial for a federated login whose verified redirect_uri is not
 * http(s) (a native app, RFC 8252): a Location header cannot carry it, so
 * the navigation runs client-side. The button stays, because a browser may
 * require a user gesture before it launches an external protocol.
 */
export default defineComponent({
    components: { AAuthShell, VCButton },
    setup() {
        const payload = injectPayload<{
            redirect: string,
            authorizeUrl: string,
            client: {
                id: string,
                name: string,
                displayName: string | null
            }
        }>();

        const title = useTranslation({
            namespace: TranslatorTranslationNamespace.CLIENT,
            key: TranslatorTranslationClientKey.RETURNING_TO_APP,
            data: { client: computed(() => payload.data.client.displayName || payload.data.client.name) },
        });

        const openLabel = useTranslation({
            namespace: TranslatorTranslationNamespace.CLIENT,
            key: TranslatorTranslationClientKey.OPEN_APP,
        });

        onMounted(() => {
            if (typeof window === 'undefined') {
                return;
            }

            // The browser sits on the consumed callback URL, so a reload or a
            // tab restore would re-run the callback against a popped state.
            // Swap the entry for the hosted login of the same request first.
            try {
                window.history.replaceState(null, '', payload.data.authorizeUrl);
            } catch {
                // a cross-origin publicUrl; the navigation below still runs
            }

            window.location.assign(payload.data.redirect);
        });

        return {
            data: payload.data,
            title,
            openLabel,
        };
    },
});
</script>
<template>
    <AAuthShell>
        <div class="flex flex-col gap-3 text-center">
            <h1 class="font-bold">
                {{ title }}
            </h1>
            <VCButton
                as="a"
                :href="data.redirect"
                color="primary"
                class="w-full"
            >
                {{ openLabel }}
            </VCButton>
        </div>
    </AAuthShell>
</template>
