<template>
    <section class="au-section au-section--alt vp-raw">
        <div class="au-section-inner">
            <header class="mb-10 text-center">
                <span class="au-eyebrow">Deployment</span>
                <h2 class="au-heading">
                    Pick your deployment
                </h2>
                <p class="au-lede mx-auto max-w-[56ch]">
                    Run Authup the way that fits your stack — from a single Docker container to a clustered, externally-backed deployment.
                </p>
            </header>

            <div class="grid grid-cols-1 gap-5 md:grid-cols-3">
                <a
                    v-for="target in targets"
                    :key="target.title"
                    :class="targetCardClass"
                    :href="target.href"
                    :style="{ '--au-target-accent': target.accent }"
                >
                    <span class="absolute inset-x-0 top-0 h-[3px] bg-[var(--au-target-accent)]" />
                    <h3 class="mb-2 text-[1.2rem] font-bold text-[var(--au-color-text)]">
                        {{ target.title }}
                    </h3>
                    <p class="mb-4 text-[0.94rem] leading-[1.5] text-[var(--au-color-text-muted)]">
                        {{ target.summary }}
                    </p>
                    <ul class="mb-5 flex grow list-none flex-col gap-[0.4rem]">
                        <li
                            v-for="bullet in target.bullets"
                            :key="bullet"
                            class="flex items-start gap-2 text-[0.9rem] text-[var(--au-color-text)]"
                        >
                            <span
                                class="shrink-0 font-bold text-[var(--au-target-accent)]"
                                aria-hidden="true"
                            >✓</span>
                            <span>{{ bullet }}</span>
                        </li>
                    </ul>
                    <span class="text-[0.92rem] font-semibold text-[var(--au-target-accent)] transition-transform duration-[120ms] ease-out group-hover:translate-x-[2px]">
                        Read more<span aria-hidden="true"> →</span>
                    </span>
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

const TARGET_CARD_CLASS = 'group relative flex flex-col overflow-hidden rounded-[var(--au-radius)] border border-[var(--au-color-divider)] bg-[var(--au-color-bg)] pt-7 px-6 pb-6 text-inherit no-underline transition-[transform,border-color,box-shadow] duration-[120ms] ease-out hover:-translate-y-0.5 hover:border-[var(--au-target-accent)] hover:shadow-[var(--au-shadow-card-hover)]';

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
                    'Stateless container, no volume required',
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

        return { targets, targetCardClass: TARGET_CARD_CLASS };
    },
});
</script>
