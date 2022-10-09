/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { NuxtLink } from '#components';

type EntityNavItem = {
    name: string,
    icon: string,
    urlSuffix: string
};

export function buildDomainEntityNav(
    path: string,
    items: EntityNavItem[],
) {
    const lastIndex = path.lastIndexOf('/');
    const basePath = path.substring(0, lastIndex);

    return h(
        'ul',
        { class: 'nav nav-pills' },
        [
            h('li', { class: 'nav-item' }, [
                h(
                    NuxtLink,
                    {
                        class: 'nav-link',
                        to: basePath,
                    },
                    {
                        default: () => [
                            h('i', { class: 'fa fa-arrow-left' }),
                        ],
                    },
                ),
            ]),
            ...items.map((item) => h('li', { class: 'nav-item' }, [
                h(
                    NuxtLink,
                    {
                        class: 'nav-link',
                        to: `${path}/${item.urlSuffix}`,
                    },
                    {
                        default: () => [
                            h('i', { class: `${item.icon} pe-1` }),
                            item.name,
                        ],
                    },
                ),
            ])),
        ],
    );
}
