<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { defineComponent } from 'vue';
import AColorModeSwitcher from './AColorModeSwitcher.vue';
import { ALanguageSwitcherDropdown } from './ALanguageSwitcherDropdown';

// Top-right control cluster shared by every logged-out auth surface
// (client-web's auth layout + the embedded SSR app): the two controls a
// visitor still needs — color mode and language. Color-mode storage is
// app-specific, so `dark` is a controlled `v-model:dark` binding.
export default defineComponent({
    components: { AColorModeSwitcher, ALanguageSwitcherDropdown },
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
    <div class="auth-gadgets">
        <AColorModeSwitcher
            :dark="dark"
            class="auth-gadget"
            @update:dark="$emit('update:dark', $event)"
        />
        <ALanguageSwitcherDropdown link-class-extra="auth-gadget" />
    </div>
</template>
<style scoped>
.auth-gadgets {
    position: fixed;
    top: 1rem;
    right: 1.25rem;
    z-index: 50;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.auth-gadget {
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

.auth-gadget:hover {
    color: var(--vc-color-fg);
    border-color: var(--authup-periwinkle, var(--vc-color-primary-500));
}
</style>
