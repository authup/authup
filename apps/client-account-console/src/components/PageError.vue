<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { useTranslations } from '@authup/client-web-kit';
import {
    TranslatorTranslationActionKey,
    TranslatorTranslationCommonKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import { VCButton } from '@vuecs/button';
import { VCAlert } from '@vuecs/elements';
import { defineComponent } from 'vue';

/**
 * The failed-load state every account page renders in place of its
 * content: one localized line plus a way back. Paired with
 * `usePageError()` (pages/utils.ts), which owns the error and takes a
 * dead session through the logout flow rather than here.
 *
 * It deliberately does NOT render the failure's own message. A load here
 * fails for reasons the reader cannot act on (the API is unreachable, a
 * gateway answered, the server broke), and the messages carry the
 * request line: hapic builds "Failed to fetch (GET <url>)" and "502 Bad
 * Gateway (GET <url>)" from the request itself, so the API url, the
 * subject uuid and the rapiq filter expression ride along. That was
 * tolerable in a toast that faded and is not in a panel that stays. An
 * ACTION failure is the opposite case, and the toasts keep translating
 * those: "already linked to another user" is exactly what its reader
 * needs.
 */
export default defineComponent({
    components: { VCAlert, VCButton },
    emits: ['retry'],
    setup() {
        const translations = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.ACTION,
                key: TranslatorTranslationActionKey.RETRY,
            },
            {
                namespace: TranslatorTranslationNamespace.COMMON,
                key: TranslatorTranslationCommonKey.LOAD_FAILED,
            },
        ]);

        return { translations };
    },
});
</script>
<template>
    <VCAlert
        color="error"
        variant="soft"
    >
        <div class="flex flex-wrap items-center justify-between gap-3">
            <span>{{ translations.loadFailed }}</span>
            <VCButton
                size="sm"
                color="error"
                variant="outline"
                @click.prevent="$emit('retry')"
            >
                {{ translations.retry }}
            </VCButton>
        </div>
    </VCAlert>
</template>
