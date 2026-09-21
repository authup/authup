<template>
    <section class="au-features au-section vp-raw">
        <header class="mb-10 text-center">
            <span class="au-eyebrow">Features</span>
            <h2 class="au-heading">
                What you get
            </h2>
            <p class="au-lede">
                A complete identity and access toolkit you can deploy as a service or embed as libraries.
            </p>
        </header>

        <div class="grid grid-cols-1 gap-5 md:grid-cols-2 vp:grid-cols-3">
            <article
                v-for="feature in features"
                :key="feature.title"
                class="au-card au-card-interactive"
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
