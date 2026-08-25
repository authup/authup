<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { AAuthApp, createColorMode } from '@authup/client-web-kit';
import { defineComponent } from 'vue';

export default defineComponent({
    components: { AAuthApp },
    setup() {
        const { isDark } = createColorMode();

        return { isDark };
    },
});
</script>
<template>
    <!--
        Auth entry pages (login, callback, logout) render without the app
        chrome: a logged-out visitor has no use for the sidebar/header, and
        the full-bleed canvas lets page backdrops reach the viewport edges
        (the default layout's .page-content padding would frame them).
        <AAuthApp> is the shared logged-out shell (mirrored by the auth
        console and the account console): the <VCToastProvider> root, the
        <AAuthGadgets> cluster (color mode + language) and the <VCToaster>
        viewport. Color mode rides the shared `vc-color-mode` cookie through
        the kit's createColorMode(), hence the v-model:dark.
    -->
    <AAuthApp v-model:dark="isDark">
        <RouterView />
    </AAuthApp>
</template>
