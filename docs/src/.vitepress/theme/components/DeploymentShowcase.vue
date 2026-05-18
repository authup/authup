<template>
    <section class="au-section au-section--alt">
        <div class="au-section-inner au-showcase">
            <header class="au-showcase__header">
                <h2 class="au-showcase__title">Pick your deployment</h2>
                <p class="au-showcase__subtitle">
                    Run Authup the way that fits your stack — from a single Docker container to a clustered, externally-backed deployment.
                </p>
            </header>

            <div class="au-showcase__grid">
                <a
                    v-for="target in targets"
                    :key="target.title"
                    class="au-target"
                    :href="target.href"
                    :style="{ '--au-target-accent': target.accent }"
                >
                    <span class="au-target__accent" />
                    <h3 class="au-target__title">{{ target.title }}</h3>
                    <p class="au-target__summary">{{ target.summary }}</p>
                    <ul class="au-target__features">
                        <li
                            v-for="bullet in target.bullets"
                            :key="bullet"
                            class="au-target__feature"
                        >
                            <span class="au-target__check" aria-hidden="true">✓</span>
                            <span>{{ bullet }}</span>
                        </li>
                    </ul>
                    <span class="au-target__cta">Read more →</span>
                </a>
            </div>
        </div>
    </section>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

type Target = {
    title: string,
    summary: string,
    bullets: string[],
    href: string,
    accent: string,
};

export default defineComponent({
    name: 'AuthupDeploymentShowcase',
    setup() {
        const targets: Target[] = [
            {
                title: 'Docker Compose',
                summary: 'The fastest way to a working Authup stack — server, UI and database wired up.',
                bullets: [
                    'Single yaml file, two services',
                    'PostgreSQL / MySQL / Redis ready',
                    'Reverse-proxy examples included',
                ],
                href: '/guide/deployment/docker-compose',
                accent: 'var(--au-color-accent-a)',
            },
            {
                title: 'Docker',
                summary: 'Run server and client as separate containers behind your existing orchestrator.',
                bullets: [
                    'One image, two commands',
                    'ENV- or file-based configuration',
                    'Persistent writable volume',
                ],
                href: '/guide/deployment/docker',
                accent: 'var(--au-color-accent-b)',
            },
            {
                title: 'Bare Metal',
                summary: 'Install on any host that runs Node.js — no container runtime required.',
                bullets: [
                    'Node.js 20+ on Linux / macOS / Windows',
                    'CLI-driven start and migrate',
                    'SQLite, PostgreSQL or MySQL',
                ],
                href: '/guide/deployment/bare-metal',
                accent: 'var(--au-color-accent-c)',
            },
        ];

        return { targets };
    },
});
</script>

<style scoped>
.au-showcase__header {
    text-align: center;
    margin-bottom: 2.5rem;
}

.au-showcase__title {
    font-size: clamp(1.75rem, 3.5vw, 2.25rem);
    font-weight: 700;
    letter-spacing: -0.02em;
    margin: 0 0 0.5rem;
    color: var(--au-color-text);
}

.au-showcase__subtitle {
    margin: 0 auto;
    max-width: 56ch;
    color: var(--au-color-text-muted);
    font-size: 1.05rem;
}

.au-showcase__grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.25rem;
}

@media (min-width: 768px) {
    .au-showcase__grid {
        grid-template-columns: repeat(3, 1fr);
    }
}

.au-target {
    position: relative;
    display: flex;
    flex-direction: column;
    padding: 1.75rem 1.5rem 1.5rem;
    background: var(--au-color-bg);
    border: 1px solid var(--au-color-divider);
    border-radius: var(--au-radius);
    text-decoration: none;
    color: inherit;
    overflow: hidden;
    transition: transform var(--au-transition), border-color var(--au-transition), box-shadow var(--au-transition);
}

.au-target:hover {
    transform: translateY(-2px);
    border-color: var(--au-target-accent);
    box-shadow: var(--au-shadow-card-hover);
    text-decoration: none;
}

.au-target__accent {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: var(--au-target-accent);
}

.au-target__title {
    font-size: 1.2rem;
    font-weight: 700;
    margin: 0 0 0.5rem;
    color: var(--au-color-text);
}

.au-target__summary {
    margin: 0 0 1rem;
    color: var(--au-color-text-muted);
    font-size: 0.94rem;
    line-height: 1.5;
}

.au-target__features {
    list-style: none;
    padding: 0;
    margin: 0 0 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    flex-grow: 1;
}

.au-target__feature {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    color: var(--au-color-text);
    font-size: 0.9rem;
}

.au-target__check {
    color: var(--au-target-accent);
    font-weight: 700;
    flex-shrink: 0;
}

.au-target__cta {
    color: var(--au-target-accent);
    font-weight: 600;
    font-size: 0.92rem;
    transition: transform var(--au-transition);
}

.au-target:hover .au-target__cta {
    transform: translateX(2px);
}
</style>
