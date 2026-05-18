<template>
    <section class="au-hero au-section">
        <div class="au-hero__grid">
            <div class="au-hero__text">
                <h1 class="au-hero__title">
                    Authup
                </h1>
                <p class="au-hero__tagline">
                    OAuth2 &amp; OpenID Connect identity and access management
                    with multi-realm tenancy and declarative, isomorphic permissions
                    you can share between API, UI, and microservices.
                </p>
                <div class="au-hero__cta">
                    <a
                        class="au-btn au-btn--primary"
                        href="/getting-started/"
                    >
                        Get Started
                    </a>
                    <a
                        class="au-btn au-btn--ghost"
                        href="https://github.com/authup/authup"
                        target="_blank"
                        rel="noopener"
                    >
                        View on GitHub
                    </a>
                </div>
            </div>

            <div class="au-hero__card-wrap">
                <div class="au-card-window">
                    <div class="au-card-window__chrome">
                        <span class="au-dot au-dot--r" />
                        <span class="au-dot au-dot--y" />
                        <span class="au-dot au-dot--g" />
                        <span class="au-card-window__title">Authup</span>
                    </div>

                    <div class="au-hero__shot">
                        <img
                            v-show="imageLoaded"
                            class="au-hero__shot-img"
                            :src="imageSrc"
                            alt="Authup admin UI"
                            loading="eager"
                            @load="imageLoaded = true"
                            @error="imageLoaded = false"
                        >
                        <div
                            v-if="!imageLoaded"
                            class="au-hero__skeleton"
                            aria-hidden="true"
                        >
                            <div class="au-hero__skeleton-side">
                                <div class="au-hero__skeleton-logo" />
                                <div class="au-hero__skeleton-nav" />
                                <div class="au-hero__skeleton-nav au-hero__skeleton-nav--active" />
                                <div class="au-hero__skeleton-nav" />
                                <div class="au-hero__skeleton-nav" />
                                <div class="au-hero__skeleton-nav" />
                            </div>
                            <div class="au-hero__skeleton-main">
                                <div class="au-hero__skeleton-crumb" />
                                <div class="au-hero__skeleton-row" />
                                <div class="au-hero__skeleton-row" />
                                <div class="au-hero__skeleton-row" />
                                <div class="au-hero__skeleton-row" />
                                <div class="au-hero__skeleton-row" />
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

<style scoped>
.au-hero {
    padding-top: 5rem;
    padding-bottom: 3rem;
}

.au-hero__grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 3rem;
    align-items: center;
}

@media (min-width: 960px) {
    .au-hero__grid {
        grid-template-columns: 1.05fr 1fr;
        gap: 4rem;
    }
}

.au-hero__title {
    font-size: clamp(3rem, 7vw, 4.75rem);
    font-weight: 800;
    line-height: 1;
    letter-spacing: -0.03em;
    margin: 0 0 1.25rem;
    background: linear-gradient(135deg, var(--au-color-primary) 0%, var(--au-color-accent-a) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
}

.au-hero__tagline {
    font-size: 1.125rem;
    line-height: 1.55;
    color: var(--au-color-text-muted);
    margin: 0 0 2rem;
    max-width: 36ch;
}

.au-hero__cta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
}

.au-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.65rem 1.25rem;
    border-radius: var(--au-radius-sm);
    font-size: 0.95rem;
    font-weight: 600;
    text-decoration: none;
    transition: transform var(--au-transition), background var(--au-transition), border-color var(--au-transition);
    border: 1px solid transparent;
}

.au-btn:hover {
    transform: translateY(-1px);
    text-decoration: none;
}

.au-btn--primary {
    background: var(--au-color-primary);
    color: white;
}

.au-btn--primary:hover {
    background: var(--au-color-primary-deep);
}

.au-btn--ghost {
    background: transparent;
    color: var(--au-color-text);
    border-color: var(--au-color-divider);
}

.au-btn--ghost:hover {
    border-color: var(--au-color-primary);
    color: var(--au-color-primary);
}

.au-hero__shot {
    position: relative;
    aspect-ratio: 16 / 10;
    background: var(--au-color-bg);
    overflow: hidden;
}

.au-hero__shot-img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top left;
}

.au-hero__skeleton {
    position: absolute;
    inset: 0;
    display: grid;
    grid-template-columns: 32% 1fr;
    gap: 1px;
    background: var(--au-color-divider);
}

.au-hero__skeleton-side,
.au-hero__skeleton-main {
    background: var(--au-color-bg);
    padding: 1rem 0.85rem;
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
}

.au-hero__skeleton-logo {
    height: 1rem;
    width: 60%;
    border-radius: 4px;
    background: color-mix(in srgb, var(--au-color-primary) 35%, var(--au-color-divider));
    margin-bottom: 0.4rem;
}

.au-hero__skeleton-nav {
    height: 0.7rem;
    width: 85%;
    border-radius: 3px;
    background: var(--au-color-bg-soft);
    border: 1px solid var(--au-color-divider);
}

.au-hero__skeleton-nav--active {
    background: color-mix(in srgb, var(--au-color-primary) 22%, transparent);
    border-color: color-mix(in srgb, var(--au-color-primary) 35%, transparent);
}

.au-hero__skeleton-crumb {
    height: 0.7rem;
    width: 45%;
    border-radius: 3px;
    background: var(--au-color-bg-soft);
    margin-bottom: 0.4rem;
}

.au-hero__skeleton-row {
    height: 1.4rem;
    border-radius: var(--au-radius-sm);
    background: var(--au-color-bg-soft);
    border: 1px solid var(--au-color-divider);
}
</style>
