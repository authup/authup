<!--
  - Copyright (c) 2025-2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { AColorModeSwitcher, ALanguageSwitcherDropdown } from '@authup/client-web-kit';
import { defineComponent } from 'vue';
import { VCToastProvider } from '@vuecs/overlays';
import { createColorMode } from './color-mode';
import { injectPayload } from './di';

export default defineComponent({
    components: {
        AColorModeSwitcher,
        ALanguageSwitcherDropdown,
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
        <div class="ui-gadgets">
            <AColorModeSwitcher
                v-model:dark="isDark"
                class="ui-gadget"
            />
            <ALanguageSwitcherDropdown link-class-extra="ui-gadget" />
        </div>

        <RouterView />
    </VCToastProvider>
</template>
<style>
.ui-gadgets {
    position: fixed;
    top: 1rem;
    right: 1.25rem;
    z-index: 50;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.ui-gadget {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 2.25rem;
    height: 2.25rem;
    padding: 0 0.6rem;
    border: 1px solid var(--vc-color-border);
    border-radius: 0.6rem;
    background: var(--vc-color-bg-elevated);
    color: var(--vc-color-fg-muted);
    cursor: pointer;
    transition: color 0.15s ease, border-color 0.15s ease;
}

.ui-gadget:hover {
    color: var(--vc-color-fg);
    border-color: var(--authup-periwinkle, var(--vc-color-primary-500));
}
</style>
