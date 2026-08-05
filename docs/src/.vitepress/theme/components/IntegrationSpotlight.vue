<template>
    <section class="au-section au-section--alt">
        <div class="au-section-inner au-spotlight">
            <div class="au-spotlight__copy">
                <span class="au-spotlight__eyebrow">Flagship deployment</span>
                <h2 class="au-spotlight__title">One docker-compose.yml, full stack ready</h2>
                <p class="au-spotlight__lede">
                    The reference deployment wires the server, the consent UI, PostgreSQL and Redis into a single
                    compose file. Bring it up locally, point a reverse proxy at it in production.
                </p>
                <ul class="au-spotlight__bullets">
                    <li>
                        <span class="au-spotlight__bullet" aria-hidden="true">✓</span>
                        One Authup image provides all services via different entrypoint commands
                    </li>
                    <li>
                        <span class="au-spotlight__bullet" aria-hidden="true">✓</span>
                        PostgreSQL or MySQL persisted in a named volume, Redis for session caching
                    </li>
                    <li>
                        <span class="au-spotlight__bullet" aria-hidden="true">✓</span>
                        Configured via environment variables, a mounted <code>.conf</code> file, or both
                    </li>
                </ul>
                <a class="au-spotlight__cta" href="/guide/deployment/docker-compose">
                    Read the Docker Compose guide →
                </a>
            </div>

            <div class="au-spotlight__code">
                <div class="au-card-window">
                    <div class="au-card-window__chrome">
                        <span class="au-dot au-dot--r" />
                        <span class="au-dot au-dot--y" />
                        <span class="au-dot au-dot--g" />
                        <span class="au-card-window__title">docker-compose.yml</span>
                    </div>
                    <pre class="au-spotlight__pre"><code>{{ snippet }}</code></pre>
                </div>
            </div>
        </div>
    </section>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
    name: 'AuthupIntegrationSpotlight',
    setup() {
        const snippet = `services:
  server-core:
    image: authup/authup:latest
    restart: unless-stopped
    volumes:
      - authup:/usr/src/app/writable
    ports:
      - "3001:3000"
    environment:
      - DB_TYPE=postgres
      - DB_HOST=postgres
      - REDIS_URL=redis://redis:6379
    command: server/core start
    depends_on: [postgres, redis]

  client-admin-console:
    image: authup/authup:latest
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NUXT_PUBLIC_API_URL=http://localhost:3001
    command: client/admin-console start
    depends_on: [server-core]

  postgres:
    image: postgres:16
    environment:
      - POSTGRES_DB=authup
      - POSTGRES_USER=authup
      - POSTGRES_PASSWORD=secret

  redis:
    image: redis:7

volumes:
  authup:`;

        return { snippet };
    },
});
</script>

<style scoped>
.au-spotlight {
    display: grid;
    grid-template-columns: 1fr;
    gap: 2.5rem;
    align-items: center;
}

@media (min-width: 960px) {
    .au-spotlight {
        grid-template-columns: 1fr 1.1fr;
        gap: 3.5rem;
    }
}

.au-spotlight__eyebrow {
    display: inline-block;
    font-size: 0.78rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--au-color-primary);
    margin-bottom: 0.75rem;
}

.au-spotlight__title {
    font-size: clamp(1.6rem, 3vw, 2.1rem);
    font-weight: 700;
    letter-spacing: -0.02em;
    margin: 0 0 1rem;
    color: var(--au-color-text);
    line-height: 1.2;
}

.au-spotlight__lede {
    margin: 0 0 1.25rem;
    color: var(--au-color-text-muted);
    font-size: 1.02rem;
    line-height: 1.6;
}

.au-spotlight__bullets {
    list-style: none;
    padding: 0;
    margin: 0 0 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
}

.au-spotlight__bullets li {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    color: var(--au-color-text);
    font-size: 0.95rem;
    line-height: 1.5;
}

.au-spotlight__bullets code {
    font-family: var(--vp-font-family-mono, ui-monospace, monospace);
    font-size: 0.85em;
    padding: 0.15em 0.4em;
    background: var(--au-color-bg);
    border-radius: 4px;
    border: 1px solid var(--au-color-divider);
    color: var(--au-color-text);
    white-space: nowrap;
}

.au-spotlight__bullet {
    color: var(--au-color-primary);
    font-weight: 700;
    flex-shrink: 0;
}

.au-spotlight__cta {
    display: inline-block;
    color: var(--au-color-primary);
    font-weight: 600;
    text-decoration: none;
    transition: transform var(--au-transition);
}

.au-spotlight__cta:hover {
    transform: translateX(3px);
    text-decoration: none;
}

.au-spotlight__pre {
    margin: 0;
    padding: 1.25rem 1.5rem;
    overflow-x: auto;
    max-height: 28rem;
    background: var(--au-color-bg-alt);
}

.au-spotlight__pre code {
    font-family: var(--vp-font-family-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
    font-size: 0.82rem;
    line-height: 1.6;
    color: var(--au-color-text);
    white-space: pre;
}
</style>
