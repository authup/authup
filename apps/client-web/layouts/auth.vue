<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { AAuthApp } from '@authup/client-web-kit';
import { defineNuxtComponent, useColorMode } from '#imports';

export default defineNuxtComponent({
    components: { AAuthApp },
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
        <AAuthApp> is the shared logged-out shell (mirrored by the embedded
        SSR app): the <VCToastProvider> root, the <AAuthGadgets> cluster
        (color mode + language) and the <VCToaster> viewport. Color-mode
        storage stays app-specific (Nuxt's useColorMode), hence the
        v-model:dark.
    -->
    <AAuthApp v-model:dark="isDark">
        <NuxtPage />
    </AAuthApp>
</template>
