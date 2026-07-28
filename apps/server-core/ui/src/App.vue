<!--
  - Copyright (c) 2025-2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { AAuthApp } from '@authup/client-web-kit';
import { defineComponent } from 'vue';
import { createColorMode } from './color-mode';
import { injectPayload } from './di';

export default defineComponent({
    components: { AAuthApp },
    setup() {
        const payload = injectPayload();

        const { isDark } = createColorMode(payload?.config?.colorMode);

        return { isDark };
    },
});
</script>
<template>
    <!--
        <AAuthApp> is the shared logged-out shell (mirrored by client-web's
        auth layout): the <VCToastProvider> root every descendant
        <VCToaster>/toast primitive needs, the gadget cluster (color mode +
        language) and the toaster viewport fed by useToast() (e.g. the
        authorize page surfacing login failures). Color-mode storage stays
        app-specific (payload-seeded cookie ref), hence the v-model:dark.
    -->
    <AAuthApp v-model:dark="isDark">
        <RouterView />
    </AAuthApp>
</template>
