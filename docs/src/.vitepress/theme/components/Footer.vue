<template>
    <footer class="au-footer vp-raw">
        <div class="au-wrap grid gap-8 py-14 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
            <div>
                <p class="mb-3 text-lg font-extrabold tracking-[-0.02em] text-night-fg">
                    Authup
                </p>
                <p class="m-0 max-w-[34ch] text-sm leading-relaxed">
                    Authup is an authentication &amp; authorization system.
                </p>
            </div>
            <nav
                v-for="column in columns"
                :key="column.title"
                :aria-label="column.title"
            >
                <h2 class="mb-3 text-sm font-semibold text-night-fg">
                    {{ column.title }}
                </h2>
                <ul class="m-0 grid list-none gap-2 p-0 text-sm">
                    <li
                        v-for="link in column.links"
                        :key="link.text"
                    >
                        <VPLink
                            class="transition-colors duration-[120ms] ease-out hover:text-night-fg"
                            :href="link.link"
                        >
                            {{ link.text }}
                        </VPLink>
                    </li>
                </ul>
            </nav>
        </div>
        <div class="border-t border-night-border">
            <div class="au-wrap flex flex-wrap items-center justify-between gap-2 py-4 text-xs">
                <span>&copy; 2021&ndash;present Authup</span>
                <a
                    class="text-night-fg-muted transition-colors duration-[120ms] ease-out hover:text-night-fg"
                    href="https://github.com/authup/authup/blob/master/LICENSING.md"
                    target="_blank"
                    rel="noopener"
                >AGPL-3.0-only</a>
            </div>
        </div>
    </footer>
</template>

<script lang="ts">
import { VPLink } from 'vitepress/theme';
import { defineComponent } from 'vue';

export default defineComponent({
    name: 'AuthupFooter',
    components: { VPLink },
    setup() {
        const columns = [
            {
                title: 'Documentation',
                links: [
                    { text: 'Getting Started', link: '/getting-started/' },
                    { text: 'User Guide', link: '/guide/user/' },
                    { text: 'Deployment', link: '/guide/deployment/' },
                    { text: 'Development', link: '/guide/development/' },
                ],
            },
            {
                title: 'SDKs',
                links: [
                    { text: 'JavaScript', link: '/sdks/javascript/' },
                    { text: 'Python', link: '/sdks/python/' },
                ],
            },
            {
                title: 'Project',
                links: [
                    { text: 'GitHub', link: 'https://github.com/authup/authup' },
                    { text: 'Team', link: '/about/team' },
                ],
            },
        ];

        return {
            columns,
        };
    },
});
</script>
