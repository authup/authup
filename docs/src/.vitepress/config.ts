import { defineConfig } from 'vitepress';

export default defineConfig({
    title: 'Authelion',
    base: '/authelion/',
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
                    { text: 'API', link: '/packages/api/' },
                    { text: 'API-Adapter', link: '/packages/api-adapter/' },
                    { text: 'API-Core', link: '/packages/api-core/' },
                    { text: 'API-Utils', link: '/packages/api-utils/' },
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
                        {text: 'What is Authelion?', link: '/guide/'}
                    ]
                },
                {
                    text: 'Backend',
                    collapsible: false,
                    items: [
                        {text: 'Extension or Standalone?', link: '/guide/extension-or-standalone'},
                        {text: 'Microservice Support', link: '/guide/microservices'},
                    ]
                },
                {
                    text: 'Frontend',
                    collapsible: false,
                    items: [
                        {text: 'Supported Frameworks', link: '/guide/supported-frameworks'},
                    ]
                },
                {
                    text: 'Shared',
                    collapsible: false,
                    items: [
                        {text: 'Resource interaction & integration', link: '/guide/resource-interaction-integration'}
                    ]
                },
            ],
            '/packages/common/': [
                {
                    text: 'Introduction',
                    collapsible: false,
                    items: [
                        {text: 'Overview', link: '/packages/common/'},
                        {text: 'Installation', link: '/packages/common/installation.md'},
                    ]
                },
                {
                    text: 'Getting Started',
                    collapsible: false,
                    items: [
                        {text: 'Permission Management', link: '/packages/common/ability-manager'},
                        {text: 'API Client', link: '/packages/common/api-client'},

                    ]
                },
                {
                    text: 'API Reference',
                    collapsible: false,
                    items: [
                        {text: 'API Client', link: '/packages/common/api-client'},
                        {text: 'Error', link: '/packages/common/api-client'},
                    ]
                },
            ],
            '/packages/api-core/': [
                {
                    text: 'Introduction',
                    collapsible: false,
                    items: [
                        {text: 'Overview', link: '/packages/api-core/'},
                    ]
                },
                {
                    text: 'Getting Started',
                    collapsible: false,
                    items: [
                        {text: 'Installation', link: '/packages/api-core/installation'},
                        {text: 'Configuration', link: '/packages/api-core/configuration'},
                        {text: 'Database', link: '/packages/api-core/database'},
                        {text: 'HTTP', link: '/packages/api-core/http'},
                        {text: 'Aggregators', link: '/packages/api-core/aggregators'},
                    ]
                },
                {
                    text: 'API Reference',
                    items: [
                        {text: 'Config', link: '/packages/api-core/api-reference-config'},
                        {text: 'Database', link: '/packages/api-core/api-reference-database'},
                        {text: 'HTTP', link: '/packages/api-core/api-reference-http'},
                    ]
                },
            ],
            '/packages/api/': [
                {
                    text: 'Introduction',
                    collapsible: false,
                    items: [
                        {text: 'Overview', link: '/packages/api/'},
                        {text: 'Getting Started', link: '/packages/api/getting-started'},
                        {text: 'Deploying', link: '/packages/api/deploying'},
                    ]
                },
            ],
            '/packages/api-adapter/': [
                {
                    text: 'Introduction',
                    collapsible: false,
                    items: [
                        {text: 'Overview', link: '/packages/api-adapter/'},
                        {text: 'Installation', link: '/packages/api-adapter/installation'},
                    ]
                },
                {
                    text: 'Middlewares',
                    collapsible: false,
                    items: [
                        {text: 'HTTP', link: '/packages/api-adapter/http'},
                        {text: 'Socket', link: '/packages/api-adapter/socket'},
                    ]
                },
            ],
            '/packages/api-utils/': [
                {
                    text: 'Introduction',
                    collapsible: false,
                    items: [
                        {text: 'Overview', link: '/packages/api-utils/'},
                        {text: 'Installation', link: '/packages/api-utils/installation'},
                    ]
                },
                {
                    text: 'API-Reference',
                    collapsible: false,
                    items: [
                        {text: 'KeyPair', link: '/packages/api-utils/key-pair'},
                        {text: 'Sign & Verify', link: '/packages/api-utils/sign-verify'},
                        {text: 'Hash', link: '/packages/api-utils/hash'},
                    ]
                },
            ],
            '/packages/vue/': [
                {
                    text: 'Introduction',
                    collapsible: false,
                    items: [
                        {text: 'Overview', link: '/packages/frontend/vue/'},
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
