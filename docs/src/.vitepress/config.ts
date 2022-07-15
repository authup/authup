import { defineConfig } from 'vitepress';

export default defineConfig({
    title: 'Authelion',
    base: '/',
    themeConfig: {
        socialLinks: [
            { icon: 'github', link: 'https://github.com/tada5hi/authelion' },
        ],
        editLink: {
            pattern: 'https://github.com/tada5hi/authelion/edit/master/docs/:path',
            text: 'Edit this page on GitHub'
        },
        nav: [
            {
                text: 'Home',
                link: '/',
                activeMatch: '/',
            },
            {
                text: 'Guide',
                link: '/guide/',
                activeMatch: '/guide/',
            },
            {
                text: 'Packages',
                activeMatch: '/packages/',
                items: [
                    { text: 'Server', link: '/packages/server/' },
                    { text: 'Server-Adapter', link: '/packages/server-adapter/' },
                    { text: 'Server-Core', link: '/packages/server-core/' },
                    { text: 'Server-Utils', link: '/packages/server-utils/' },
                    { text: 'Common', link: '/packages/common/' },
                    { text: 'Vue', link: '/packages/vue/' },
                ]
            },
            {
                text: 'About',
                activeMatch: '/about/',
                items: [
                    { text: 'Team', link: '/about/team' },
                ]
            }
        ],
        sidebar: {
            '/guide/': [
                {
                    text: 'Introduction',
                    collapsible: false,
                    items: [
                        {text: 'What is Authelion?', link: '/guide/'},
                    ]
                },
                {
                    text: 'Packages',
                    collapsible: false,
                    items: [
                        {text: 'Backend', link: '/guide/backend'},
                        {text: 'Frontend', link: '/guide/frontend'},
                        {text: 'Shared', link: '/guide/shared'},
                    ]
                },
            ],
            '/packages/common/': [
                {
                    text: 'Common',
                    collapsible: false,
                    items: [
                        {text: 'Introduction', link: '/packages/common/'},
                        {text: 'Installation', link: '/packages/common/installation.md'},
                    ]
                },
                {
                    text: 'Getting Started',
                    collapsible: false,
                    items: [
                        {text: 'Ability Manager', link: '/packages/common/ability-manager'},
                        {text: 'API Client', link: '/packages/common/api-client'},

                    ]
                },
                {
                    text: 'API Reference',
                    collapsible: false,
                    items: [
                        {text: 'Ability', link: '/packages/common/ability-api-reference'},
                        {text: 'Error', link: '/packages/common/error-api-reference'},
                    ]
                },
            ],
            '/packages/server-core/': [
                {
                    text: 'Server Core',
                    collapsible: false,
                    items: [
                        {text: 'Introduction', link: '/packages/server-core/'},
                    ]
                },
                {
                    text: 'Getting Started',
                    collapsible: false,
                    items: [
                        {text: 'Installation', link: '/packages/server-core/installation'},
                        {text: 'Configuration', link: '/packages/server-core/configuration'},
                        {text: 'Database', link: '/packages/server-core/database'},
                        {text: 'HTTP', link: '/packages/server-core/http'},
                        {text: 'Aggregators', link: '/packages/server-core/aggregators'},
                    ]
                },
                {
                    text: 'Database',
                    items: [
                        {text: 'Defining Entity Relations', link: '/packages/server-core/defining-relations'}
                    ]
                },
                {
                    text: 'API Reference',
                    items: [
                        {text: 'Config', link: '/packages/server-core/api-reference-config'},
                        {text: 'Database', link: '/packages/server-core/api-reference-database'},
                        {text: 'HTTP', link: '/packages/server-core/api-reference-http'},
                    ]
                },
            ],
            '/packages/server/': [
                {
                    text: 'Server',
                    collapsible: false,
                    items: [
                        {text: 'Introduction', link: '/packages/server/'},
                        {text: 'Getting Started', link: '/packages/server/getting-started'},
                        {text: 'Deploying', link: '/packages/server/deploying'},
                    ]
                },
            ],
            '/packages/server-adapter/': [
                {
                    text: 'Server Adapter',
                    collapsible: false,
                    items: [
                        {text: 'Overview', link: '/packages/server-adapter/'},
                        {text: 'Installation', link: '/packages/server-adapter/installation'},
                    ]
                },
                {
                    text: 'Middlewares',
                    collapsible: false,
                    items: [
                        {text: 'HTTP', link: '/packages/server-adapter/http'},
                        {text: 'Socket', link: '/packages/server-adapter/socket'},
                    ]
                },
            ],
            '/packages/server-utils/': [
                {
                    text: 'Server Utils',
                    collapsible: false,
                    items: [
                        {text: 'Introduction', link: '/packages/server-utils/'},
                        {text: 'Installation', link: '/packages/server-utils/installation'},
                    ]
                },
                {
                    text: 'API-Reference',
                    collapsible: false,
                    items: [
                        {text: 'KeyPair', link: '/packages/server-utils/key-pair'},
                        {text: 'Sign & Verify', link: '/packages/server-utils/sign-verify'},
                        {text: 'Hash', link: '/packages/server-utils/hash'},
                    ]
                },
            ],
            '/packages/vue/': [
                {
                    text: 'Vue',
                    collapsible: false,
                    items: [
                        {text: 'Introduction', link: '/packages/frontend/vue/'},
                        {text: 'Installation', link: '/packages/frontend/vue/installation'}
                    ]
                },
                {
                    text: 'Components',
                    collapsible: false,
                    items: [
                        {text: 'Lists', link: '/packages/frontend/vue/lists'},
                        {text: 'Items', link: '/packages/frontend/vue/items'},
                        {text: 'Forms', link: '/packages/frontend/vue/forms'}
                    ]
                },
                {
                    text: 'API Reference',
                    collapsible: false,
                    items: [
                        {text: 'Components', link: '/packages/frontend/vue/components'}
                    ]
                }
            ]
        }
    }
});
