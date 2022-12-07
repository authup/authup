import { defineConfig } from 'vitepress';

export default defineConfig({
    title: 'Authup',
    base: '/',
    themeConfig: {
        socialLinks: [
            { icon: 'github', link: 'https://github.com/tada5hi/authup' },
        ],
        editLink: {
            pattern: 'https://github.com/tada5hi/authup/edit/master/docs/:path',
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
                    { text: 'Server-Common', link: '/packages/server-common/' },
                    { text: 'Server-Database', link: '/packages/server-database/' },
                    { text: 'Server-HTTP', link: '/packages/server-http/' },
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
                        {text: 'What is Authup?', link: '/guide/'},
                        {text: 'Getting Started', link: '/guide/getting-started'}
                    ]
                },
                {
                    text: 'Packages',
                    collapsible: false,
                    items: [
                        {text: 'Overview', link: '/guide/overview'},
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
                        {text: 'Domains', link: '/packages/common/domains'},
                    ]
                },
                {
                    text: 'API Reference',
                    collapsible: false,
                    items: [
                        {text: 'Ability', link: '/packages/common/ability-api-reference'},
                        {text: 'Domains', link: '/packages/common/domains-api-reference'},
                        {text: 'Error', link: '/packages/common/error-api-reference'},
                    ]
                },
            ],
            '/packages/server-database/': [
                {
                    text: 'Server Database',
                    collapsible: false,
                    items: [
                        {text: 'Introduction', link: '/packages/server-database/'},
                        {text: 'Installation', link: '/packages/server-database/installation'},
                        {text: 'Configuration', link: '/packages/server-database/configuration'},
                    ]
                },
                {
                    text: 'Components',
                    collapsible: false,
                    items: [
                        {text: 'Entities', link: '/packages/server-database/entities'},
                        {text: 'Seeds', link: '/packages/server-database/seeds'},
                        {text: 'Subscribers', link: '/packages/server-database/subscribers'},
                        {text: 'Aggregators', link: '/packages/server-database/aggregators'},
                    ]
                },
                {
                    text: 'API Reference',
                    items: [
                        {text: 'Config', link: '/packages/server-database/api-reference-config'},
                        {text: 'General', link: '/packages/server-database/api-reference'}
                    ]
                },
            ],
            '/packages/server-http/': [
                {
                    text: 'Server HTTP',
                    collapsible: false,
                    items: [
                        {text: 'Introduction', link: '/packages/server-http/'},
                        {text: 'Installation', link: '/packages/server-http/installation'},
                        {text: 'Configuration', link: '/packages/server-http/configuration'},
                    ]
                },
                {
                    text: 'Components',
                    collapsible: false,
                    items: [
                        {text: 'Controllers', link: '/packages/server-http/controllers'},
                        {text: 'Middlewares', link: '/packages/server-http/middlewares'},
                    ]
                },
                {
                    text: 'API Reference',
                    items: [
                        {text: 'Config', link: '/packages/server-http/api-reference-config'},
                        {text: 'Middleware', link: '/packages/server-http/api-reference-middleware'},
                    ]
                },
            ],
            '/packages/server/': [
                {
                    text: 'Server',
                    collapsible: false,
                    items: [
                        {text: 'Introduction', link: '/packages/server/'}
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
            '/packages/server-common/': [
                {
                    text: 'Server Common',
                    collapsible: false,
                    items: [
                        {text: 'Introduction', link: '/packages/server-common/'},
                        {text: 'Installation', link: '/packages/server-common/installation'},
                    ]
                },
                {
                    text: 'API-Reference',
                    collapsible: false,
                    items: [
                        {text: 'KeyPair', link: '/packages/server-common/key-pair'},
                        {text: 'Sign & Verify', link: '/packages/server-common/sign-verify'},
                        {text: 'Hash', link: '/packages/server-common/hash'},
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
