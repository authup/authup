import { defineConfig } from 'vitepress';

const guideContributingSidebar = [
    {
        text: 'Server Core',
        items: [
            { text: 'Controllers', link: '/guide/contributing/controllers' },
            { text: 'Middlewares', link: '/guide/contributing/middlewares' },
            { text: 'Policy Engine', link: '/guide/contributing/policy-engine' },
            { text: 'Database: Entities', link: '/guide/contributing/database-entities' },
            { text: 'Database: Subscribers', link: '/guide/contributing/database-subscribers' },
            { text: 'Database: OAuth2', link: '/guide/contributing/database-oauth2' },
        ],
    },
    {
        text: 'Server Kit',
        items: [
            { text: 'Core Types', link: '/guide/contributing/shared-core-types' },
            { text: 'Hash', link: '/guide/contributing/shared-hash' },
            { text: 'Key Pair', link: '/guide/contributing/shared-key-pair' },
            { text: 'Sign & Verify', link: '/guide/contributing/shared-sign-verify' },
        ],
    },
    {
        text: 'Testing',
        items: [
            { text: 'Test Kit', link: '/guide/contributing/test-kit' },
        ],
    },
];

export default defineConfig({
    title: 'Authup',
    base: '/',
    themeConfig: {
        socialLinks: [
            {
                icon: 'github',
                link: 'https://github.com/authup/authup', 
            },
        ],
        editLink: {
            pattern: 'https://github.com/authup/authup/edit/master/docs/:path',
            text: 'Edit this page on GitHub',
        },
        nav: [
            {
                text: 'Home',
                link: '/',
                activeMatch: '/',
            },
            {
                text: 'Getting Started',
                link: '/getting-started/',
                activeMatch: '/getting-started/',
            },
            {
                text: 'Guide',
                activeMatch: '/guide/',
                items: [
                    {
                        text: 'User',
                        link: '/guide/user/', 
                    },
                    {
                        text: 'Development',
                        link: '/guide/development/', 
                    },
                    {
                        text: 'Deployment',
                        link: '/guide/deployment/', 
                    },
                ],
            },
            {
                text: 'SDKs',
                activeMatch: '/sdks/',
                items: [
                    {
                        text: 'JavaScript',
                        link: '/sdks/javascript/', 
                    },
                    {
                        text: 'Python',
                        link: '/sdks/python/', 
                    },
                ],
            },
            {
                text: 'About',
                activeMatch: '/about/',
                items: [
                    {
                        text: 'Team',
                        link: '/about/team', 
                    },
                ],
            },
        ],
        sidebar: {
            '/getting-started/': [
                {
                    text: 'Overview',
                    items: [
                        {
                            text: 'What is Authup?',
                            link: '/getting-started/', 
                        },
                        {
                            text: 'Features',
                            link: '/getting-started/features', 
                        },
                        {
                            text: 'Architecture',
                            link: '/getting-started/architecture', 
                        },
                        {
                            text: 'Guides',
                            link: '/getting-started/guides', 
                        },
                    ],
                },
            ],
            '/guide/user/': [
                {
                    text: 'Getting Started',
                    items: [
                        {
                            text: 'Introduction',
                            link: '/guide/user/', 
                        },
                    ],
                },
                {
                    text: 'Concepts',
                    items: [
                        // { text: 'Single Sign-On (SSO)', link: '/guide/user/sso' },
                        {
                            text: 'Permissions & Policies',
                            link: '/guide/user/permissions-and-policies', 
                        },
                        {
                            text: 'Trust Anchors',
                            link: '/guide/user/trust-anchors',
                        },
                        {
                            text: 'OAuth Client Certificates',
                            link: '/guide/user/client-certificates',
                        },
                    ],
                },
                /*
                {
                    text: 'Dashboard',
                    items: [
                        { text: 'Roles', link: '/guide/user/roles' },
                        { text: 'Permissions', link: '/guide/user/permissions' },
                        { text: 'Clients', link: '/guide/user/clients' },
                        { text: 'Scopes', link: '/guide/user/scopes' },
                        { text: 'Identity Providers', link: '/guide/user/identity-providers' },
                        { text: 'Users', link: '/guide/user/users' },
                    ]
                },

                 */
                {
                    text: 'Troubleshooting & FAQ',
                    items: [
                        {
                            text: 'FAQ',
                            link: '/guide/user/faq', 
                        },
                        {
                            text: 'Contact',
                            link: '/guide/user/contact', 
                        },
                    ],
                },
            ],
            '/guide/deployment': [
                {
                    text: 'Getting Started',
                    items: [
                        {
                            text: 'Introduction',
                            link: '/guide/deployment/', 
                        },
                    ],
                },
                {
                    text: 'Configuration',
                    items: [
                        {
                            text: 'Introduction',
                            link: '/guide/deployment/configuration', 
                        },
                        {
                            text: 'server:core',
                            link: '/guide/deployment/configuration-server-core',
                            items: [
                                {
                                    text: 'General',
                                    link: '/guide/deployment/configuration-server-core', 
                                },
                                {
                                    text: 'Database',
                                    link: '/guide/deployment/configuration-server-core-database', 
                                },
                                {
                                    text: 'Redis',
                                    link: '/guide/deployment/configuration-server-core-redis', 
                                },
                                {
                                    text: 'MFA',
                                    link: '/guide/deployment/configuration-server-core-mfa',
                                },
                                {
                                    text: 'SMTP',
                                    link: '/guide/deployment/configuration-server-core-smtp',
                                },
                            ],
                        },
                        {
                            text: 'client:web',
                            link: '/guide/deployment/configuration-client-web', 
                        },
                    ],
                },
                {
                    text: 'Targets',
                    items: [
                        {
                            text: 'Bare Metal',
                            link: '/guide/deployment/bare-metal', 
                        },
                        {
                            text: 'Docker',
                            link: '/guide/deployment/docker', 
                        },
                        {
                            text: 'Docker Compose',
                            link: '/guide/deployment/docker-compose', 
                        },
                    ],
                },
                {
                    text: 'Provisioning',
                    items: [
                        {
                            text: 'Overview',
                            link: '/guide/deployment/provisioning', 
                        },
                    ],
                },
                {
                    text: 'Reverse Proxy',
                    items: [
                        {
                            text: 'Nginx',
                            link: '/guide/deployment/nginx',
                        },
                        {
                            text: 'Traefik',
                            link: '/guide/deployment/traefik',
                        },
                    ],
                },
                {
                    text: 'Upgrading',
                    items: [
                        {
                            text: 'Upgrade Notes',
                            link: '/guide/deployment/upgrading',
                        },
                    ],
                },
            ],
            '/guide/development': [
                {
                    text: 'Getting Started',
                    items: [
                        {
                            text: 'Introduction',
                            link: '/guide/development/', 
                        },
                        {
                            text: 'Code of Conduct',
                            link: '/guide/development/code-of-conduct', 
                        },
                        {
                            text: 'Submission Guidelines',
                            link: '/guide/development/submission-guidelines',
                        },
                        {
                            text: 'Workflow',
                            link: '/guide/development/workflow',
                        },
                        {
                            text: 'Repository Structure',
                            link: '/guide/development/repository-structure',
                        },
                        {
                            text: 'Quick Start',
                            link: '/guide/development/quick-start', 
                        },
                    ],
                },
                {
                    text: 'Integration',
                    items: [
                        {
                            text: 'Introduction',
                            link: '/guide/development/integration', 
                        },
                        {
                            text: 'SKDs',
                            link: '/guide/development/sdks', 
                        },
                        {
                            text: 'Projects (Showcases)',
                            link: '/guide/development/projects', 
                        },
                    ],
                },
                {
                    text: 'API',
                    items: [
                        {
                            text: 'Introduction',
                            link: '/guide/development/api-introduction',
                        },
                        {
                            text: 'OAuth2',
                            link: '/guide/development/api-oauth2',
                        },
                        {
                            text: 'Examples',
                            link: '/guide/development/api-examples',
                        },
                        {
                            text: 'Error Handling',
                            link: '/guide/development/api-error-handling',
                        },
                    ],
                },
                {
                    text: 'Internals',
                    collapsed: true,
                    items: guideContributingSidebar,
                },
            ],
            '/guide/contributing': guideContributingSidebar,
            '/sdks/python': [
                {
                    text: 'Python',
                    link: '/sdks/python', 
                },
            ],
            '/sdks/javascript/': [
                {
                    text: 'Access',
                    items: [
                        {
                            text: 'Introduction',
                            link: '/sdks/javascript/access/', 
                        },
                        {
                            text: 'Concepts',
                            items: [
                                {
                                    text: 'Permission Checker',
                                    link: '/sdks/javascript/access/permission-checker', 
                                },
                                {
                                    text: 'Policies',
                                    link: '/sdks/javascript/access/policies', 
                                },
                            ],
                        },
                        {
                            text: 'API Reference',
                            link: '/sdks/javascript/access/api-reference', 
                        },
                    ],
                },
                {
                    text: 'Client-Web-Kit',
                    items: [
                        {
                            text: 'Introduction',
                            link: '/sdks/javascript/client-web-kit/', 
                        },
                        {
                            text: 'Concepts',
                            items: [
                                {
                                    text: 'Session',
                                    link: '/sdks/javascript/client-web-kit/session', 
                                },
                            ],
                        },
                        {
                            text: 'Components',
                            items: [
                                {
                                    text: 'Records',
                                    link: '/sdks/javascript/client-web-kit/records',
                                },
                                {
                                    text: 'Forms',
                                    link: '/sdks/javascript/client-web-kit/forms',
                                },
                                {
                                    text: 'Collections',
                                    link: '/sdks/javascript/client-web-kit/collections',
                                },
                            ],
                        },
                    ],
                },
                {
                    text: 'Client-Web-Nuxt',
                    items: [
                        {
                            text: 'Introduction',
                            link: '/sdks/javascript/client-web-nuxt/', 
                        },
                        {
                            text: 'Concepts',
                            items: [
                                {
                                    text: 'Route Protection',
                                    link: '/sdks/javascript/client-web-nuxt/route-protection', 
                                },
                            ],
                        },
                    ],
                },
                {
                    text: 'Core-Kit',
                    items: [
                        {
                            text: 'Introduction',
                            link: '/sdks/javascript/core-kit/', 
                        },
                        {
                            text: 'API Reference',
                            link: '/sdks/javascript/core-kit/api-reference', 
                        },
                    ],
                },
                {
                    text: 'Core-HTTP-Kit',
                    items: [
                        {
                            text: 'Introduction',
                            link: '/sdks/javascript/core-http-kit/', 
                        },
                        {
                            text: 'Concepts',
                            items: [
                                {
                                    text: 'Interceptor',
                                    link: '/sdks/javascript/core-http-kit/interceptor', 
                                },
                                {
                                    text: 'Token Creator',
                                    link: '/sdks/javascript/core-http-kit/token-creator', 
                                },
                                {
                                    text: 'Token Verifier',
                                    link: '/sdks/javascript/core-http-kit/token-verifier', 
                                },
                                {
                                    text: 'Client',
                                    link: '/sdks/javascript/core-http-kit/client',
                                },
                                {
                                    text: 'Testing',
                                    link: '/sdks/javascript/core-http-kit/testing',
                                },
                            ],
                        },
                    ],
                },
                {
                    text: 'Server-Adapters',
                    items: [
                        {
                            text: 'Introduction',
                            link: '/sdks/javascript/server-adapter/',
                        },
                        {
                            text: 'Adapters',
                            items: [
                                {
                                    text: 'Node',
                                    link: '/sdks/javascript/server-adapter/node-middleware',
                                },
                                {
                                    text: 'Socket.IO',
                                    link: '/sdks/javascript/server-adapter/socket-middleware',
                                },
                                {
                                    text: 'Web',
                                    link: '/sdks/javascript/server-adapter/web-middleware',
                                },
                            ],
                        },
                    ],
                },
            ],
        },
    },
});
