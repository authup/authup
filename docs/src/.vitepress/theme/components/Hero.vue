<template>
    <header class="au-section au-section--alt au-night au-hero vp-raw pt-20 pb-16">
        <div class="au-section-inner">
            <div class="max-w-[640px]">
                <span class="au-eyebrow text-night-accent-1">Authentication &amp; Authorization</span>
                <h1 class="mb-5 leading-[1.05] font-extrabold tracking-[-0.03em] text-[clamp(2.75rem,6.5vw,4.5rem)]">
                    OAuth2 &amp; OpenID Connect identity and
                    <span class="au-gradient-text">access management</span>
                </h1>
                <p class="mb-8 max-w-[46ch] text-lg leading-[1.55] text-night-fg-muted">
                    With multi-realm tenancy and declarative, isomorphic permissions you can share between
                    API, UI, and microservices.
                </p>
                <div class="flex flex-wrap gap-3">
                    <a
                        :class="primaryButtonClass"
                        href="/getting-started/"
                    >
                        Get Started
                    </a>
                    <a
                        :class="secondaryButtonClass"
                        href="https://github.com/authup/authup"
                        target="_blank"
                        rel="noopener"
                    >
                        View on GitHub
                    </a>
                </div>
            </div>

            <div
                class="mt-16 flex items-end gap-3 md:mt-20 md:gap-4"
                aria-hidden="true"
            >
                <span
                    v-for="(glyph, index) in keyholes"
                    :key="index"
                    class="au-keyhole au-keyhole-pulse"
                    :class="glyph.colorClass"
                    :style="{ '--au-keyhole-opacity': glyph.opacity, '--au-keyhole-delay': glyph.delay }"
                />
            </div>
        </div>
    </header>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

// The hero's motif: a quiet row of "keyhole" glyphs (see the shape rules for
// `.au-keyhole` in style.css), echoing the circle-over-body mark in the
// Authup logo instead of a stock illustration. Mostly the muted primary
// tone, with two accent glyphs standing out — a rhythm, not a chart.
const KEYHOLES = [
    { colorClass: 'text-night-accent-1', opacity: 0.35, delay: '0s' },
    { colorClass: 'text-night-accent-1', opacity: 0.55, delay: '-0.6s' },
    { colorClass: 'text-night-accent-3', opacity: 0.5, delay: '-1.2s' },
    { colorClass: 'text-night-accent-1', opacity: 0.8, delay: '-0.3s' },
    { colorClass: 'text-night-accent-2', opacity: 1, delay: '-1.8s' },
    { colorClass: 'text-night-accent-1', opacity: 0.8, delay: '-0.9s' },
    { colorClass: 'text-night-accent-3', opacity: 0.5, delay: '-1.5s' },
    { colorClass: 'text-night-accent-1', opacity: 0.55, delay: '-0.2s' },
    { colorClass: 'text-night-accent-1', opacity: 0.35, delay: '-1s' },
    { colorClass: 'text-night-accent-1', opacity: 0.5, delay: '-0.7s' },
    { colorClass: 'text-night-accent-3', opacity: 0.4, delay: '-1.4s' },
    { colorClass: 'text-night-accent-1', opacity: 0.3, delay: '-0.4s' },
];

const PRIMARY_BUTTON_CLASS = 'inline-flex items-center justify-center rounded-[var(--au-radius-sm)] border border-transparent bg-[var(--au-color-primary)] px-5 py-[0.65rem] text-[0.95rem] font-semibold text-white no-underline shadow-[0_8px_24px_-8px_rgb(99_102_241)] transition-[transform,background,border-color] duration-[120ms] ease-out hover:-translate-y-px hover:bg-[var(--au-night-accent-1)]';

const SECONDARY_BUTTON_CLASS = 'inline-flex items-center justify-center rounded-[var(--au-radius-sm)] border border-white/20 bg-white/5 px-5 py-[0.65rem] text-[0.95rem] font-semibold text-night-fg no-underline transition-[transform,background,border-color] duration-[120ms] ease-out hover:-translate-y-px hover:border-white/40';

export default defineComponent({
    name: 'AuthupHero',
    setup() {
        return {
            keyholes: KEYHOLES,
            primaryButtonClass: PRIMARY_BUTTON_CLASS,
            secondaryButtonClass: SECONDARY_BUTTON_CLASS,
        };
    },
});
</script>
