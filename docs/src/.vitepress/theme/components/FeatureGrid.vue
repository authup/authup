<template>
    <section class="au-features au-section vp-raw">
        <header class="mb-10 text-center">
            <h2 class="mb-2 text-[clamp(1.75rem,3.5vw,2.25rem)] font-bold tracking-[-0.02em] text-[var(--au-color-text)]">
                What you get
            </h2>
            <p class="text-[1.05rem] text-[var(--au-color-text-muted)]">
                A complete identity and access toolkit you can deploy as a service or embed as libraries.
            </p>
        </header>

        <div class="grid grid-cols-1 gap-5 md:grid-cols-2 vp:grid-cols-3">
            <article
                v-for="feature in features"
                :key="feature.title"
                class="rounded-[var(--au-radius)] border border-[var(--au-color-divider)] bg-[var(--au-color-bg)] p-6 transition-[transform,border-color,box-shadow] duration-[120ms] ease-out hover:-translate-y-0.5 hover:border-[var(--au-color-primary)] hover:shadow-[var(--au-shadow-card)]"
            >
                <div
                    class="mb-3 text-[1.75rem] leading-none"
                    aria-hidden="true"
                >
                    {{ feature.icon }}
                </div>
                <h3 class="mb-2 text-[1.1rem] font-bold text-[var(--au-color-text)]">
                    {{ feature.title }}
                </h3>
                <p class="text-[0.94rem] leading-[1.55] text-[var(--au-color-text-muted)]">
                    {{ feature.detail }}
                </p>
            </article>
        </div>
    </section>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

type Feature = {
    icon: string,
    title: string,
    detail: string,
};

export default defineComponent({
    name: 'AuthupFeatureGrid',
    setup() {
        const features: Feature[] = [
            {
                icon: '🛡️',
                title: 'Identity & Access',
                detail: 'Manage users, clients, roles and permissions through one declarative API. Multi-tenant by design with realms.',
            },
            {
                icon: '📜',
                title: 'OAuth2 & OIDC',
                detail: 'Standards-compliant authorization, refresh, password and client-credentials grants with PKCE enforcement for public clients out of the box.',
            },
            {
                icon: '🌍',
                title: 'Multi-Realm Tenancy',
                detail: 'Isolate users, clients and policies per realm. Mount any controller under /realms/:realmId for nested routing.',
            },
            {
                icon: '🧩',
                title: 'Isomorphic Permissions',
                detail: 'Serialize policy bindings between server, browser and microservices. The same evaluator runs in API, UI and edge functions.',
            },
            {
                icon: '🔌',
                title: 'Identity Brokering',
                detail: 'Federate via LDAP and OpenID Connect upstream providers. Map external attributes onto Authup users automatically.',
            },
            {
                icon: '⚙️',
                title: 'Declarative Provisioning',
                detail: 'Seed realms, roles, users and permissions from JSON, YAML or TypeScript files. Idempotent on every startup.',
            },
        ];

        return { features };
    },
});
</script>
