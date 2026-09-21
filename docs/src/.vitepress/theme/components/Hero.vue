<template>
    <header class="au-section au-section--alt au-night au-hero vp-raw pt-20 pb-16">
        <div class="au-section-inner grid grid-cols-1 items-center gap-12 vp:grid-cols-[1.05fr_1fr] vp:gap-16">
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

            <div>
                <div class="au-card-window au-card-window--night">
                    <div class="au-card-window__chrome">
                        <span class="au-dot au-dot--r" />
                        <span class="au-dot au-dot--y" />
                        <span class="au-dot au-dot--g" />
                        <span class="au-card-window__title">Terminal</span>
                    </div>
                    <div :class="cardBodyClass">
                        <div class="flex flex-wrap items-center justify-between gap-3">
                            <p class="m-0 flex items-baseline gap-2 overflow-x-auto whitespace-nowrap">
                                <span
                                    class="text-night-accent-1"
                                    aria-hidden="true"
                                >$</span>
                                <code class="bg-transparent p-0 text-night-fg">{{ command }}</code>
                            </p>
                            <button
                                type="button"
                                :class="copyButtonClass"
                                @click="copy"
                            >
                                {{ copied ? 'Copied' : 'Copy' }}
                            </button>
                        </div>
                        <span
                            class="sr-only"
                            role="status"
                            aria-live="polite"
                        >{{ copied ? 'Command copied to clipboard' : '' }}</span>

                        <ul class="m-0 mt-4 flex list-none flex-col gap-[0.4rem] p-0">
                            <li
                                v-for="line in output"
                                :key="line.label"
                                class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-night-fg-muted"
                            >
                                <span
                                    class="text-night-accent-1"
                                    aria-hidden="true"
                                >&gt;</span>
                                <span>{{ line.label }}:</span>
                                <code class="break-all bg-transparent p-0 text-night-fg">{{ line.value }}</code>
                            </li>
                        </ul>
                    </div>
                </div>

                <p class="mt-4 max-w-[42ch] text-[0.9rem] leading-[1.5] text-night-fg-muted">
                    The fastest way to try Authup — no database required, SQLite storage only. Not for production.
                    <a
                        class="inline-block font-semibold text-night-accent-1 no-underline transition-transform duration-[120ms] ease-out hover:translate-x-[3px]"
                        href="/guide/deployment/"
                    >
                        See the deployment guide<span aria-hidden="true"> &rarr;</span>
                    </a>
                </p>
            </div>
        </div>
    </header>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';

// Quick Start, verbatim from the repo README (`npx authup@latest start`):
// needs no configuration, falls back to SQLite for trying things out and
// local development — not production — and serves the API and both consoles.
const COMMAND = 'npx authup@latest start';

const OUTPUT_LINES = [
    { label: 'API', value: 'http://localhost:3000/' },
    { label: 'Admin console', value: 'http://localhost:3000/console/admin' },
];

const PRIMARY_BUTTON_CLASS = 'inline-flex items-center justify-center rounded-[var(--au-radius-sm)] border border-transparent bg-[var(--au-color-primary)] px-5 py-[0.65rem] text-[0.95rem] font-semibold text-white no-underline shadow-[0_8px_24px_-8px_var(--au-color-accent-a)] transition-[transform,background,border-color] duration-[120ms] ease-out hover:-translate-y-px hover:bg-[var(--au-night-accent-1)]';

const SECONDARY_BUTTON_CLASS = 'inline-flex items-center justify-center rounded-[var(--au-radius-sm)] border border-white/20 bg-white/5 px-5 py-[0.65rem] text-[0.95rem] font-semibold text-night-fg no-underline transition-[transform,background,border-color] duration-[120ms] ease-out hover:-translate-y-px hover:border-white/40';

const CARD_BODY_CLASS = 'px-5 py-5 font-[var(--vp-font-family-mono,ui-monospace,SFMono-Regular,Menlo,monospace)] text-[0.86rem] leading-[1.7]';

const COPY_BUTTON_CLASS = 'shrink-0 cursor-pointer appearance-none rounded-[var(--au-radius-sm)] border border-white/15 bg-transparent px-[0.6rem] py-[0.3rem] text-[0.75rem] font-semibold text-night-fg-muted transition-[border-color,color] duration-[120ms] ease-out hover:border-white/30 hover:text-night-fg';

export default defineComponent({
    name: 'AuthupHero',
    setup() {
        const copied = ref(false);

        async function copy() {
            try {
                if (typeof navigator !== 'undefined' && navigator.clipboard) {
                    await navigator.clipboard.writeText(COMMAND);
                    copied.value = true;
                    setTimeout(() => {
                        copied.value = false;
                    }, 1500);
                }
            } catch {
                // ignore
            }
        }

        return {
            primaryButtonClass: PRIMARY_BUTTON_CLASS,
            secondaryButtonClass: SECONDARY_BUTTON_CLASS,
            command: COMMAND,
            output: OUTPUT_LINES,
            cardBodyClass: CARD_BODY_CLASS,
            copyButtonClass: COPY_BUTTON_CLASS,
            copied,
            copy,
        };
    },
});
</script>
