<template>
    <section class="au-section au-section--alt vp-raw">
        <div class="au-section-inner grid grid-cols-1 items-center gap-10 vp:grid-cols-[1fr_1.1fr] vp:gap-14">
            <div>
                <span class="au-eyebrow">Flagship deployment</span>
                <h2 class="mb-4 text-[clamp(1.6rem,3vw,2.1rem)] font-bold leading-[1.2] tracking-[-0.02em] text-[var(--au-color-text)]">
                    One docker-compose.yml, full stack ready
                </h2>
                <p class="mb-5 text-[1.02rem] leading-[1.6] text-[var(--au-color-text-muted)]">
                    The reference deployment wires the server, the consent UI, PostgreSQL and Redis into a single
                    compose file. Bring it up locally, point a reverse proxy at it in production.
                </p>
                <ul class="mb-6 flex list-none flex-col gap-[0.6rem]">
                    <li class="flex items-start gap-2 text-[0.95rem] leading-[1.5] text-[var(--au-color-text)]">
                        <span
                            class="shrink-0 font-bold text-[var(--au-color-primary)]"
                            aria-hidden="true"
                        >✓</span>
                        One Authup container serves the API, the login pages and both consoles
                    </li>
                    <li class="flex items-start gap-2 text-[0.95rem] leading-[1.5] text-[var(--au-color-text)]">
                        <span
                            class="shrink-0 font-bold text-[var(--au-color-primary)]"
                            aria-hidden="true"
                        >✓</span>
                        PostgreSQL or MySQL persisted in a named volume, Redis for session caching
                    </li>
                    <li class="flex items-start gap-2 text-[0.95rem] leading-[1.5] text-[var(--au-color-text)]">
                        <span
                            class="shrink-0 font-bold text-[var(--au-color-primary)]"
                            aria-hidden="true"
                        >✓</span>
                        Configured via environment variables, a mounted <code class="rounded-[4px] border border-[var(--au-color-divider)] bg-[var(--au-color-bg)] px-[0.4em] py-[0.15em] font-[var(--vp-font-family-mono,ui-monospace,monospace)] text-[0.85em] whitespace-nowrap text-[var(--au-color-text)]">authup.yml</code> file, or
                        both
                    </li>
                </ul>
                <a
                    class="inline-block font-semibold text-[var(--au-color-primary)] no-underline transition-transform duration-[120ms] ease-out hover:translate-x-[3px]"
                    href="/guide/deployment/docker-compose"
                >
                    Read the Docker Compose guide<span aria-hidden="true"> →</span>
                </a>
            </div>

            <div>
                <div class="au-card-window">
                    <div class="au-card-window__chrome">
                        <span class="au-dot au-dot--r" />
                        <span class="au-dot au-dot--y" />
                        <span class="au-dot au-dot--g" />
                        <span class="au-card-window__title">docker-compose.yml</span>
                    </div>
                    <pre class="m-0 max-h-[28rem] overflow-x-auto bg-[var(--au-color-bg-alt)] px-6 py-5"><code class="whitespace-pre font-[var(--vp-font-family-mono,ui-monospace,SFMono-Regular,Menlo,monospace)] text-[0.82rem] leading-[1.6] text-[var(--au-color-text)]">{{ snippet }}</code></pre>
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
    ports:
      - "3000:3000"
    environment:
      - PUBLIC_URL=http://localhost:3000
      - DB_TYPE=postgres
      - DB_HOST=postgres
      - DB_USERNAME=authup
      - DB_PASSWORD=secret
      - DB_DATABASE=authup
      - REDIS=redis://redis:6379
    command: start
    depends_on: [postgres, redis]

  postgres:
    image: postgres:16
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=authup
      - POSTGRES_USER=authup
      - POSTGRES_PASSWORD=secret

  redis:
    image: redis:7

volumes:
  postgres_data:`;

        return { snippet };
    },
});
</script>
