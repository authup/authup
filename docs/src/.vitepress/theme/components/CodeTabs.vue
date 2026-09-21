<template>
    <section class="au-section vp-raw">
        <header class="mb-8 text-center">
            <span class="au-eyebrow">Quick Start</span>
            <h2 class="au-heading">
                From zero to issuing tokens in three steps
            </h2>
            <p class="au-lede mx-auto max-w-[56ch]">
                Pull the image, point it at your database, and issue your first access token.
            </p>
        </header>

        <div class="overflow-hidden rounded-[var(--au-radius)] border border-[var(--au-color-divider)] bg-[var(--au-color-bg-alt)] shadow-[var(--au-shadow-card)]">
            <div
                class="flex items-center gap-1 border-b border-[var(--au-color-divider)] bg-[var(--au-color-bg-soft)] py-2 pr-2 pl-3"
                role="tablist"
            >
                <button
                    v-for="tab in tabs"
                    :key="tab.id"
                    type="button"
                    role="tab"
                    :aria-selected="active === tab.id"
                    class="cursor-pointer appearance-none rounded-[var(--au-radius-sm)] border-none bg-transparent px-[0.85rem] py-[0.4rem] text-[0.88rem] font-semibold transition-[background,color] duration-[120ms] ease-out"
                    :class="active === tab.id
                        ? 'bg-[var(--au-color-bg)] text-[var(--au-color-primary)]'
                        : 'text-[var(--au-color-text-muted)] hover:bg-[var(--au-color-bg)] hover:text-[var(--au-color-text)]'"
                    @click="active = tab.id"
                >
                    {{ tab.label }}
                </button>
                <button
                    type="button"
                    class="ml-auto cursor-pointer appearance-none rounded-[var(--au-radius-sm)] border border-[var(--au-color-divider)] bg-transparent px-[0.7rem] py-[0.35rem] text-[0.8rem] font-semibold text-[var(--au-color-text-muted)] transition-[border-color,color] duration-[120ms] ease-out hover:border-[var(--au-color-primary)] hover:text-[var(--au-color-primary)]"
                    @click="copy"
                >
                    {{ copied ? 'Copied' : 'Copy' }}
                </button>
            </div>
            <pre class="m-0 overflow-x-auto bg-[var(--au-color-bg-alt)] px-6 py-5"><code class="whitespace-pre bg-transparent p-0 font-[var(--vp-font-family-mono,ui-monospace,SFMono-Regular,Menlo,monospace)] text-[0.88rem] leading-[1.6] text-[var(--au-color-text)]">{{ currentSnippet }}</code></pre>
        </div>
    </section>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from 'vue';

type TabId = 'install' | 'configure' | 'use';

type Tab = {
    id: TabId,
    label: string,
    snippet: string,
};

export default defineComponent({
    name: 'AuthupCodeTabs',
    setup() {
        const tabs: Tab[] = [
            {
                id: 'configure',
                label: '1. Configure',
                snippet: `# .env
# Point these at your own PostgreSQL, Redis and public address.
USER_ADMIN_PASSWORD=start123

DB_TYPE=postgres
DB_HOST=postgres.example.com
DB_PORT=5432
DB_USERNAME=authup
DB_PASSWORD=secret
DB_DATABASE=authup

REDIS=redis://cache.example.com:6379
PUBLIC_URL=https://auth.example.com`,
            },
            {
                id: 'install',
                label: '2. Install',
                snippet: `docker pull authup/authup:latest

# reads the .env from step 1
docker run -d \\
  --name authup \\
  -p 3000:3000 \\
  --env-file .env \\
  authup/authup:latest \\
  start`,
            },
            {
                id: 'use',
                label: '3. Use',
                snippet: `# Issue an access token
curl -X POST https://auth.example.com/token \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "grant_type=client_credentials" \\
  -d "client_id=$CLIENT_ID" \\
  -d "client_secret=$CLIENT_SECRET"

# Call a protected resource
curl https://auth.example.com/users \\
  -H "Authorization: Bearer $ACCESS_TOKEN"`,
            },
        ];

        const active = ref<TabId>('configure');
        const copied = ref(false);

        const currentSnippet = computed(() => tabs.find((t) => t.id === active.value)?.snippet ?? '');

        async function copy() {
            try {
                if (typeof navigator !== 'undefined' && navigator.clipboard) {
                    await navigator.clipboard.writeText(currentSnippet.value);
                    copied.value = true;
                    setTimeout(() => {
                        copied.value = false;
                    }, 1500);
                }
            } catch (e) {
                // ignore
            }
        }

        return { tabs, active, copied, currentSnippet, copy };
    },
});
</script>
