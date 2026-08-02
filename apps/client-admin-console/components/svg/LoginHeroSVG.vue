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
        height: {
            type: [Number, String],
            default: 150,
        },
    },
});
</script>
<template>
    <!--
        The authup logo mark (circle + trapezoid keyhole) on a periwinkle
        disc, wrapped in orbit rings that echo the aurora backdrop. Inline
        so the brand tokens resolve per color mode.
    -->
    <svg
        viewBox="0 0 220 180"
        xmlns="http://www.w3.org/2000/svg"
        :height="height"
        class="login-hero-svg mx-auto"
        aria-hidden="true"
    >
        <ellipse
            cx="110"
            cy="90"
            rx="95"
            ry="46"
            fill="none"
            stroke="var(--authup-periwinkle, #6d7fcc)"
            stroke-opacity="0.4"
            stroke-width="2"
        />
        <ellipse
            cx="110"
            cy="90"
            rx="66"
            ry="84"
            fill="none"
            stroke="var(--authup-rose, #cc8181)"
            stroke-opacity="0.32"
            stroke-width="2"
            transform="rotate(22 110 90)"
        />
        <circle
            cx="205"
            cy="90"
            r="5"
            fill="var(--authup-rose, #cc8181)"
        />
        <circle
            cx="40"
            cy="58"
            r="4"
            fill="var(--authup-periwinkle, #6d7fcc)"
        />
        <circle
            cx="150"
            cy="22"
            r="3.5"
            fill="var(--authup-periwinkle, #6d7fcc)"
            opacity="0.7"
        />
        <circle
            cx="110"
            cy="90"
            r="36"
            fill="var(--authup-periwinkle, #6d7fcc)"
        />
        <circle
            cx="110"
            cy="81"
            r="9.5"
            fill="#fff"
        />
        <path
            d="M102.5 84 L117.5 84 L114 104 L106 104 Z"
            fill="#fff"
        />
    </svg>
</template>
