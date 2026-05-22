<!--
  - Copyright (c) 2025-2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { defineComponent } from 'vue';
import { VCToastProvider } from '@vuecs/overlays';

export default defineComponent({ components: { VCToastProvider } });
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
    -->
    <VCToastProvider>
        <RouterView />
    </VCToastProvider>
</template>
