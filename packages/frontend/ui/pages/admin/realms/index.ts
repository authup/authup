/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { useToast } from 'vue-toastification';
import { NuxtLink } from '#components';
import { definePageMeta, resolveComponent } from '#imports';
import { LayoutKey, LayoutNavigationID } from '../../../config/layout';

export default defineComponent({
    setup() {
        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            [LayoutKey.NAVIGATION_ID]: LayoutNavigationID.ADMIN,
        });

        const items = [
            {
                name: 'overview',
                urlSuffix: '',
                icon: 'fa fa-bars',
            },
            {
                name: 'add',
                urlSuffix: '/add',
                icon: 'fa fa-plus',
            },
        ];

        const handleDeleted = (e) => {
            const toast = useToast();
            toast.success(`The realm ${e.name} was successfully deleted.`);
        };

        const handleFailed = (e) => {
            const toast = useToast();
            toast.warning(e.message);
        };

        const nuxtPage = resolveComponent('NuxtPage');

        return () => h('div', [
            h('h1', { class: 'title no-border mb-3' }, [
                h('i', { class: 'fas fa-university me-1' }),
                'Realm',
                h('span', { class: 'sub-title ms-1' }, [
                    'Management',
                ]),
            ]),
            h('div', { class: 'content-wrapper' }, [
                h('div', { class: 'content-sidebar flex-column' }, [
                    h(
                        'ul',
                        { class: 'nav nav-pills flex-column' },
                        items.map((item) => h('li', { class: 'nav-item' }, [
                            h(
                                NuxtLink,
                                {
                                    class: 'nav-link',
                                    to: `/admin/realms${item.urlSuffix}`,
                                },
                                {
                                    default: () => [
                                        h('i', { class: `${item.icon} pe-1` }),
                                        item.name,
                                    ],
                                },
                            ),
                        ])),
                    ),
                ]),
                h('div', { class: 'content-container' }, [
                    h(nuxtPage, {
                        onDeleted: handleDeleted,
                        onFailed: handleFailed,
                    }),
                ]),
            ]),
        ]);
    },
});
