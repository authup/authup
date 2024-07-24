// https://v3.nuxtjs.org/api/configuration/nuxt.config

import path from 'node:path';
import { defineNuxtConfig } from 'nuxt/config';

export default defineNuxtConfig({
    build: {
        transpile: [
            'vue-toastification',
        ],
    },
    experimental: {
        // todo: enable after v3.12.4
        scanPageMeta: false,
    },
    css: [
        '@fortawesome/fontawesome-free/css/all.css',
        'bootstrap/dist/css/bootstrap.css',
        '@/assets/css/vue-layout-navigation.css',
        '@/assets/css/vue-toastification.css',
        '@/assets/css/root.css',
        '@/assets/css/core/header.css',
        '@/assets/css/core/navbar.css',
        '@/assets/css/core/body.css',
        '@/assets/css/core/sidebar.css',
        '@/assets/css/core/footer.css',
        '@/assets/css/domain.css',
        '@/assets/css/root.css',
        '@/assets/css/card.css',
        '@/assets/css/form.css',
        '@/assets/css/generics.css',
        '@/assets/css/bootstrap-override.css',
        '@/assets/css/oauth2.css',
    ],
    alias: {
        '@authup/core-kit': path.join(__dirname, '..', 'core-kit', 'src'),
        '@authup/kit': path.join(__dirname, '..', 'kit', 'src'),
        '@authup/client-web-kit': path.join(__dirname, '..', 'client-web-kit', 'src'),
    },
    runtimeConfig: {
        public: {
            apiUrl: process.env.API_URL || 'http://localhost:3001',
            publicUrl: process.env.PUBLIC_URL || 'http://localhost:3000',
        },
    },
    modules: [
        [
            '@nuxtjs/google-fonts', {
                families: {
                    Asap: true,
                    Nunito: true,
                },
                download: true,
            },
        ],
        '@pinia/nuxt',
    ],
});
