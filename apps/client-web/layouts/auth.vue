<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { AAuthGadgets } from '@authup/client-web-kit';
import { VCToastProvider, VCToaster } from '@vuecs/overlays';
import { defineNuxtComponent, useColorMode } from '#imports';

export default defineNuxtComponent({
    components: {
        AAuthGadgets,
        VCToastProvider,
        VCToaster,
    },
    setup() {
        const { isDark } = useColorMode();

        return { isDark };
    },
});
</script>
<template>
    <!--
        Auth entry pages (login, callback) render without the app chrome:
        a logged-out visitor has no use for the sidebar/header, and the
        full-bleed canvas lets page backdrops reach the viewport edges
        (the default layout's .page-content padding would frame them).
        The two controls a logged-out user still needs — color mode and
        language — live in the shared <AAuthGadgets> cluster (mirrored by
        the embedded SSR app).
        VCToastProvider wraps the layout root for the same reason as in
        the default layout: the toaster and any descendant toast usage
        share one Reka ToastProviderContext.
    -->
    <VCToastProvider>
        <div class="auth-layout">
            <AAuthGadgets v-model:dark="isDark" />

            <NuxtPage />

            <VCToaster position="top-center" />
        </div>
    </VCToastProvider>
</template>
<style>
.auth-layout {
    position: relative;
    min-height: 100vh;
    width: 100%;
}
</style>
