// https://v3.nuxtjs.org/api/configuration/nuxt.config

import { defineNuxtConfig } from 'nuxt/config';
import path from 'path';

export default defineNuxtConfig({
    build: {
        transpile: [
            'vue-toastification',
        ],
    },
    experimental: {
        writeEarlyHints: false,
    },
    css: [
        '@fortawesome/fontawesome-free/css/all.css',
        'bootstrap/dist/css/bootstrap.css',
        'vue-toastification/dist/index.css',
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
        '@authup/common': path.join(__dirname, '..', 'common', 'src'),
        '@authup/server-common': path.join(__dirname, '..', 'server-common', 'src'),
        '@authup/vue': path.join(__dirname, '..', 'vue', 'src'),
    },
    runtimeConfig: {
        public: {
            apiUrl: 'http://localhost:3001',
            publicUrl: 'http://localhost:3000',
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
