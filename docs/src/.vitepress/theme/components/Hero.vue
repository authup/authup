<template>
    <section class="au-hero au-section vp-raw pt-20 pb-12">
        <div class="grid grid-cols-1 items-center gap-12 vp:grid-cols-[1.05fr_1fr] vp:gap-16">
            <div>
                <h1 class="mb-5 leading-none font-extrabold tracking-[-0.03em] text-[clamp(3rem,7vw,4.75rem)] bg-[linear-gradient(135deg,var(--au-color-primary)_0%,var(--au-color-accent-a)_100%)] bg-clip-text text-transparent">
                    Authup
                </h1>
                <p class="mb-8 max-w-[36ch] text-lg leading-[1.55] text-[var(--au-color-text-muted)]">
                    OAuth2 &amp; OpenID Connect identity and access management
                    with multi-realm tenancy and declarative, isomorphic permissions
                    you can share between API, UI, and microservices.
                </p>
                <div class="flex flex-wrap gap-3">
                    <a
                        class="inline-flex items-center justify-center rounded-[var(--au-radius-sm)] border border-transparent bg-[var(--au-color-primary)] px-5 py-[0.65rem] text-[0.95rem] font-semibold text-white no-underline transition-[transform,background,border-color] duration-[120ms] ease-out hover:-translate-y-px hover:bg-[var(--au-color-primary-deep)]"
                        href="/getting-started/"
                    >
                        Get Started
                    </a>
                    <a
                        class="inline-flex items-center justify-center rounded-[var(--au-radius-sm)] border border-[var(--au-color-divider)] bg-transparent px-5 py-[0.65rem] text-[0.95rem] font-semibold text-[var(--au-color-text)] no-underline transition-[transform,background,border-color] duration-[120ms] ease-out hover:-translate-y-px hover:border-[var(--au-color-primary)] hover:text-[var(--au-color-primary)]"
                        href="https://github.com/authup/authup"
                        target="_blank"
                        rel="noopener"
                    >
                        View on GitHub
                    </a>
                </div>
            </div>

            <div>
                <div class="au-card-window">
                    <div class="au-card-window__chrome">
                        <span class="au-dot au-dot--r" />
                        <span class="au-dot au-dot--y" />
                        <span class="au-dot au-dot--g" />
                        <span class="au-card-window__title">Authup</span>
                    </div>

                    <div class="relative aspect-[16/10] overflow-hidden bg-[var(--au-color-bg)]">
                        <img
                            v-show="imageLoaded"
                            class="absolute inset-0 h-full w-full object-cover object-left-top"
                            :src="imageSrc"
                            alt="Authup admin UI"
                            loading="eager"
                            @load="imageLoaded = true"
                            @error="imageLoaded = false"
                        >
                        <div
                            v-if="!imageLoaded"
                            class="absolute inset-0 grid grid-cols-[32%_1fr] gap-px bg-[var(--au-color-divider)]"
                            aria-hidden="true"
                        >
                            <div class="flex flex-col gap-[0.65rem] bg-[var(--au-color-bg)] px-[0.85rem] py-4">
                                <div class="mb-[0.4rem] h-4 w-3/5 rounded-[4px] bg-[color-mix(in_srgb,var(--au-color-primary)_35%,var(--au-color-divider))]" />
                                <div class="h-[0.7rem] w-[85%] rounded-[3px] border border-[var(--au-color-divider)] bg-[var(--au-color-bg-soft)]" />
                                <div class="h-[0.7rem] w-[85%] rounded-[3px] border border-[color-mix(in_srgb,var(--au-color-primary)_35%,transparent)] bg-[color-mix(in_srgb,var(--au-color-primary)_22%,transparent)]" />
                                <div class="h-[0.7rem] w-[85%] rounded-[3px] border border-[var(--au-color-divider)] bg-[var(--au-color-bg-soft)]" />
                                <div class="h-[0.7rem] w-[85%] rounded-[3px] border border-[var(--au-color-divider)] bg-[var(--au-color-bg-soft)]" />
                                <div class="h-[0.7rem] w-[85%] rounded-[3px] border border-[var(--au-color-divider)] bg-[var(--au-color-bg-soft)]" />
                            </div>
                            <div class="flex flex-col gap-[0.65rem] bg-[var(--au-color-bg)] px-[0.85rem] py-4">
                                <div class="mb-[0.4rem] h-[0.7rem] w-[45%] rounded-[3px] bg-[var(--au-color-bg-soft)]" />
                                <div class="h-[1.4rem] rounded-[var(--au-radius-sm)] border border-[var(--au-color-divider)] bg-[var(--au-color-bg-soft)]" />
                                <div class="h-[1.4rem] rounded-[var(--au-radius-sm)] border border-[var(--au-color-divider)] bg-[var(--au-color-bg-soft)]" />
                                <div class="h-[1.4rem] rounded-[var(--au-radius-sm)] border border-[var(--au-color-divider)] bg-[var(--au-color-bg-soft)]" />
                                <div class="h-[1.4rem] rounded-[var(--au-radius-sm)] border border-[var(--au-color-divider)] bg-[var(--au-color-bg-soft)]" />
                                <div class="h-[1.4rem] rounded-[var(--au-radius-sm)] border border-[var(--au-color-divider)] bg-[var(--au-color-bg-soft)]" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';

export default defineComponent({
    name: 'AuthupHero',
    setup() {
        const imageLoaded = ref(false);
        const imageSrc = '/hero-admin.png';

        return { imageLoaded, imageSrc };
    },
});
</script>
