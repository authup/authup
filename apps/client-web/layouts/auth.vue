<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { AColorModeSwitcher, ALanguageSwitcherDropdown } from '@authup/client-web-kit';
import { VCToastProvider, VCToaster } from '@vuecs/overlays';
import { defineNuxtComponent, useColorMode } from '#imports';

export default defineNuxtComponent({
    components: {
        AColorModeSwitcher,
        ALanguageSwitcherDropdown,
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
        language — live in the top-right gadget cluster.
        VCToastProvider wraps the layout root for the same reason as in
        the default layout: the toaster and any descendant toast usage
        share one Reka ToastProviderContext.
    -->
    <VCToastProvider>
        <div class="auth-layout">
            <div class="auth-layout-gadgets">
                <AColorModeSwitcher
                    v-model:dark="isDark"
                    class="auth-layout-gadget"
                />
                <ALanguageSwitcherDropdown link-class-extra="auth-layout-gadget" />
            </div>

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

.auth-layout-gadgets {
    position: absolute;
    top: 1rem;
    right: 1.25rem;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.auth-layout-gadget {
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

.auth-layout-gadget:hover {
    color: var(--vc-color-fg);
    border-color: var(--authup-periwinkle, var(--vc-color-primary-500));
}
</style>
