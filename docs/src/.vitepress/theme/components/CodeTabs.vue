<template>
    <section class="au-section">
        <header class="au-codetabs__header">
            <h2 class="au-codetabs__title">From zero to issuing tokens in three steps</h2>
            <p class="au-codetabs__subtitle">
                Pull the image, point it at your database, and issue your first access token.
            </p>
        </header>

        <div class="au-codetabs">
            <div class="au-codetabs__tabs" role="tablist">
                <button
                    v-for="tab in tabs"
                    :key="tab.id"
                    type="button"
                    role="tab"
                    :aria-selected="active === tab.id"
                    class="au-codetabs__tab"
                    :class="{ 'au-codetabs__tab--active': active === tab.id }"
                    @click="active = tab.id"
                >
                    {{ tab.label }}
                </button>
                <button
                    type="button"
                    class="au-codetabs__copy"
                    @click="copy"
                >
                    {{ copied ? 'Copied' : 'Copy' }}
                </button>
            </div>
            <pre class="au-codetabs__pre"><code>{{ currentSnippet }}</code></pre>
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
                id: 'install',
                label: '1. Install',
                snippet: `docker pull authup/authup:latest

docker run -d \\
  --name authup \\
  -p 3000:3000 \\
  -v authup:/var/lib/authup \\
  authup/authup:latest \\
  start`,
            },
            {
                id: 'configure',
                label: '2. Configure',
                snippet: `# .env
USER_ADMIN_PASSWORD=start123

DB_TYPE=postgres
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=authup
DB_PASSWORD=secret
DB_DATABASE=authup

REDIS=redis://redis:6379
PUBLIC_URL=https://auth.example.com`,
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

        const active = ref<TabId>('install');
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

<style scoped>
.au-codetabs__header {
    text-align: center;
    margin-bottom: 2rem;
}

.au-codetabs__title {
    font-size: clamp(1.75rem, 3.5vw, 2.25rem);
    font-weight: 700;
    letter-spacing: -0.02em;
    margin: 0 0 0.5rem;
    color: var(--au-color-text);
}

.au-codetabs__subtitle {
    margin: 0 auto;
    max-width: 56ch;
    color: var(--au-color-text-muted);
    font-size: 1.05rem;
}

.au-codetabs {
    background: var(--au-color-bg-alt);
    border: 1px solid var(--au-color-divider);
    border-radius: var(--au-radius);
    overflow: hidden;
    box-shadow: var(--au-shadow-card);
}

.au-codetabs__tabs {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.5rem 0.5rem 0.5rem 0.75rem;
    background: var(--au-color-bg-soft);
    border-bottom: 1px solid var(--au-color-divider);
}

.au-codetabs__tab {
    appearance: none;
    background: transparent;
    border: none;
    padding: 0.4rem 0.85rem;
    border-radius: var(--au-radius-sm);
    font-size: 0.88rem;
    font-weight: 600;
    color: var(--au-color-text-muted);
    cursor: pointer;
    transition: background var(--au-transition), color var(--au-transition);
}

.au-codetabs__tab:hover {
    color: var(--au-color-text);
    background: var(--au-color-bg);
}

.au-codetabs__tab--active {
    color: var(--au-color-primary);
    background: var(--au-color-bg);
}

.au-codetabs__copy {
    margin-left: auto;
    appearance: none;
    background: transparent;
    border: 1px solid var(--au-color-divider);
    padding: 0.35rem 0.7rem;
    border-radius: var(--au-radius-sm);
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--au-color-text-muted);
    cursor: pointer;
    transition: border-color var(--au-transition), color var(--au-transition);
}

.au-codetabs__copy:hover {
    border-color: var(--au-color-primary);
    color: var(--au-color-primary);
}

.au-codetabs__pre {
    margin: 0;
    padding: 1.25rem 1.5rem;
    overflow-x: auto;
    background: var(--au-color-bg-alt);
}

.au-codetabs__pre code {
    font-family: var(--vp-font-family-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
    font-size: 0.88rem;
    line-height: 1.6;
    color: var(--au-color-text);
    background: transparent;
    padding: 0;
    white-space: pre;
}
</style>
