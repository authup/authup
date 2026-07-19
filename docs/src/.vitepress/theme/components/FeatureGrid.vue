<template>
    <section class="au-features au-section">
        <header class="au-features__header">
            <h2 class="au-features__title">What you get</h2>
            <p class="au-features__subtitle">
                A complete identity and access toolkit you can deploy as a service or embed as libraries.
            </p>
        </header>

        <div class="au-features__grid">
            <article
                v-for="feature in features"
                :key="feature.title"
                class="au-feature"
            >
                <div class="au-feature__icon" aria-hidden="true">{{ feature.icon }}</div>
                <h3 class="au-feature__title">{{ feature.title }}</h3>
                <p class="au-feature__detail">{{ feature.detail }}</p>
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

<style scoped>
.au-features__header {
    text-align: center;
    margin-bottom: 2.5rem;
}

.au-features__title {
    font-size: clamp(1.75rem, 3.5vw, 2.25rem);
    font-weight: 700;
    letter-spacing: -0.02em;
    margin: 0 0 0.5rem;
    color: var(--au-color-text);
}

.au-features__subtitle {
    margin: 0;
    color: var(--au-color-text-muted);
    font-size: 1.05rem;
}

.au-features__grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.25rem;
}

@media (min-width: 768px) {
    .au-features__grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (min-width: 960px) {
    .au-features__grid {
        grid-template-columns: repeat(3, 1fr);
    }
}

.au-feature {
    padding: 1.5rem;
    background: var(--au-color-bg);
    border: 1px solid var(--au-color-divider);
    border-radius: var(--au-radius);
    transition: transform var(--au-transition), border-color var(--au-transition), box-shadow var(--au-transition);
}

.au-feature:hover {
    transform: translateY(-2px);
    border-color: var(--au-color-primary);
    box-shadow: var(--au-shadow-card);
}

.au-feature__icon {
    font-size: 1.75rem;
    margin-bottom: 0.75rem;
    line-height: 1;
}

.au-feature__title {
    font-size: 1.1rem;
    font-weight: 700;
    margin: 0 0 0.5rem;
    color: var(--au-color-text);
}

.au-feature__detail {
    margin: 0;
    color: var(--au-color-text-muted);
    font-size: 0.94rem;
    line-height: 1.55;
}
</style>
