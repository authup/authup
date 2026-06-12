<!--
  - Copyright (c) 2025-2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { AAuthGadgets } from '@authup/client-web-kit';
import { defineComponent } from 'vue';
import { VCToastProvider, VCToaster } from '@vuecs/overlays';
import { createColorMode } from './color-mode';
import { injectPayload } from './di';

export default defineComponent({
    components: {
        AAuthGadgets,
        VCToastProvider,
        VCToaster,
    },
    setup() {
        const payload = injectPayload();

        const { isDark } = createColorMode(payload?.config?.colorMode);

        return { isDark };
    },
});
</script>
<template>
    <!--
        Wrap the app root in <VCToastProvider> so any descendant <VCToaster>
        (or component that renders Reka toast primitives) has the required
        ToastProviderContext injection — matching client-web's auth layout.
        The <VCToaster> viewport renders the queue fed by useToast() (e.g.
        the authorize page surfacing login failures).

        The gadget cluster mirrors client-web's auth layout: the two controls
        a visitor on any auth page still needs — color mode and language.
    -->
    <VCToastProvider>
        <AAuthGadgets v-model:dark="isDark" />

        <RouterView />

        <VCToaster position="top-center" />
    </VCToastProvider>
</template>
