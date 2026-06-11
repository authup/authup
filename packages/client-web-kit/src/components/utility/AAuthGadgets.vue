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
    <div class="a-auth-gadgets">
        <AColorModeSwitcher
            :dark="dark"
            class="a-auth-gadget"
            @update:dark="$emit('update:dark', $event)"
        />
        <ALanguageSwitcherDropdown link-class-extra="a-auth-gadget" />
    </div>
</template>
