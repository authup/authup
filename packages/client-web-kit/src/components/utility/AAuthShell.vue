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
<style scoped>
.auth-shell {
    position: relative;
    min-height: 100vh;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    padding: 2rem 1rem;
}

.auth-shell-aurora {
    position: absolute;
    inset: -20%;
    z-index: 0;
    pointer-events: none;
    background:
        radial-gradient(
            38% 48% at 22% 22%,
            color-mix(in oklab, var(--authup-periwinkle, #6d7fcc) 50%, transparent),
            transparent 70%
        ),
        radial-gradient(
            42% 52% at 80% 28%,
            color-mix(in oklab, var(--authup-rose, #cc8181) 38%, transparent),
            transparent 70%
        ),
        radial-gradient(
            52% 60% at 50% 92%,
            color-mix(in oklab, var(--authup-periwinkle, #6d7fcc) 32%, transparent),
            transparent 70%
        );
    filter: blur(70px);
    opacity: 0.5;
}

.auth-shell-card {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 460px;
    padding: 1.75rem;
    border: 1px solid var(--vc-color-border);
    border-radius: 1rem;
    background: var(--vc-color-bg-elevated);
    color: var(--vc-color-fg);
    box-shadow: 0 18px 45px -18px rgb(0 0 0 / 35%);
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.auth-shell-logo {
    display: flex;
    justify-content: center;
}
</style>
