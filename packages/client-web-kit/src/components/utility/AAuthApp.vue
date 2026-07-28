<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { VCToastProvider, VCToaster } from '@vuecs/overlays';
import { defineComponent } from 'vue';
import AAuthGadgets from './AAuthGadgets.vue';

// Shared shell for the logged-out auth surfaces (client-web's auth layout
// + the embedded SSR app root):
//
//   - <VCToastProvider> wraps the root so any descendant <VCToaster> (or
//     component rendering Reka toast primitives) shares one required
//     ToastProviderContext injection.
//   - <AAuthGadgets> — the two controls a logged-out visitor still needs
//     (color mode + language). Color-mode storage is app-specific, so
//     `dark` stays a controlled `v-model:dark` binding.
//   - The full-bleed `.a-auth-app` canvas lets page backdrops reach the
//     viewport edges.
//   - <VCToaster> renders the queue fed by useToast() (e.g. the authorize
//     page surfacing login failures).
export default defineComponent({
    components: {
        AAuthGadgets,
        VCToastProvider,
        VCToaster,
    },
    props: {
        dark: {
            type: Boolean,
            default: false,
        },
    },
    emits: ['update:dark'],
});
</script>
<template>
    <VCToastProvider>
        <div class="a-auth-app">
            <AAuthGadgets
                :dark="dark"
                @update:dark="$emit('update:dark', $event)"
            />

            <slot />

            <VCToaster position="top-center" />
        </div>
    </VCToastProvider>
</template>
