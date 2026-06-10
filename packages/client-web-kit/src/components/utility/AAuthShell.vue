<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
    props: {
        // Compact authup mark in the card header. The full hero artwork
        // stays an app concern (client-web's login entry); the shell only
        // carries the small brand identity for backend-served auth pages.
        logo: {
            type: Boolean,
            default: true,
        },
    },
});
</script>
<template>
    <div class="auth-shell">
        <div
            class="auth-shell-aurora"
            aria-hidden="true"
        />
        <div class="auth-shell-card">
            <div
                v-if="logo"
                class="auth-shell-logo"
            >
                <svg
                    viewBox="0 0 100 100"
                    width="40"
                    height="40"
                    aria-hidden="true"
                >
                    <rect
                        x="8"
                        y="8"
                        width="84"
                        height="84"
                        rx="16"
                        fill="var(--authup-slate-800, #34353a)"
                    />
                    <circle
                        cx="50"
                        cy="42"
                        r="12"
                        fill="#fff"
                    />
                    <path
                        d="M 41 44 L 59 44 L 55 68 L 45 68 Z"
                        fill="#fff"
                    />
                </svg>
            </div>
            <slot />
        </div>
    </div>
</template>
