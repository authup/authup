<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
/* global window */
import { TranslatorTranslationCommonKey, TranslatorTranslationNamespace } from '@authup/i18n';
import { defineComponent, onMounted } from 'vue';
import { useTranslation } from '../../../core';
import AuthorizeText from './AuthorizeText.vue';

/**
 * Zero-UI terminal for a `prompt=none` (silent) authorize request: builds the
 * OIDC error redirect (`redirect_uri?error=<code>&state`) and navigates to it
 * on mount. Rendered only when `redirect_uri` was verified against a
 * registered client pattern — the caller falls back to interactive UI
 * otherwise (never redirect an OIDC error to an unverified URI).
 *
 * The redirect is client-only (`window`), so SSR renders the "redirecting"
 * text and the browser performs the navigation after hydration.
 */
export default defineComponent({
    components: { AuthorizeText },
    props: {
        redirectUri: { type: String, required: true },
        error: { type: String, required: true },
        state: { type: String },
    },
    setup(props) {
        const message = useTranslation({
            namespace: TranslatorTranslationNamespace.COMMON,
            key: TranslatorTranslationCommonKey.LOADING,
        });

        onMounted(() => {
            const url = new URL(props.redirectUri);
            url.searchParams.set('error', props.error);
            if (props.state) {
                url.searchParams.set('state', props.state);
            }

            if (typeof window !== 'undefined') {
                window.location.href = url.href;
            }
        });

        return { message };
    },
});
</script>
<template>
    <AuthorizeText :message="message" />
</template>
