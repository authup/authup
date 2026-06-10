<!--
  - Copyright (c) 2025-2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { AAuthGadgets } from '@authup/client-web-kit';
import { defineComponent } from 'vue';
import { VCToastProvider } from '@vuecs/overlays';
import { createColorMode } from './color-mode';
import { injectPayload } from './di';

export default defineComponent({
    components: {
        AAuthGadgets,
        VCToastProvider,
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
        ToastProviderContext injection. The consent UI doesn't mount a toaster
        today, but kit components may render toast primitives — keeping the
        provider here matches the client-web app and avoids surprise injection
        errors when new entry points get added. <VCToastProvider> renders its
        default slot transparently when no toaster is mounted.

        The gadget cluster mirrors client-web's auth layout: the two controls
        a visitor on any auth page still needs — color mode and language.
    -->
    <VCToastProvider>
        <AAuthGadgets v-model:dark="isDark" />

        <RouterView />
    </VCToastProvider>
</template>
