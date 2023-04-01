/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { VNodeChild } from 'vue';
import { NuxtLink } from '#components';

type EntityNavItem = {
    name: string,
    icon: string,
    urlSuffix: string
};

type EntityNavOptions = {
    direction?: 'vertical' | 'horizontal',
    prevLink?: boolean
};

export function buildDomainEntityNav(
    path: string,
    items: EntityNavItem[],
    options?: EntityNavOptions,
) {
    const lastIndex = path.lastIndexOf('/');
    const basePath = path.substring(0, lastIndex);

    options = options || {};

    const clazz : string[] = [
        'nav nav-pills',
    ];

    switch (options.direction) {
        case 'vertical':
            clazz.push('flex-column');
            break;
    }

    let prevLink : VNodeChild = [];
    if (options.prevLink) {
        prevLink = h('li', { class: 'nav-item' }, [
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
        ]);
    }

    const buildLink = (link: string) => {
        if (link.length === 0) {
            return path;
        }

        if (link.substring(0, 1) === '/') {
            return `${path}${link}`;
        }

        return `${path}/${link}`;
    };

    return h(
        'ul',
        { class: clazz },
        [
            prevLink,
            ...items.map((item) => h('li', { class: 'nav-item' }, [
                h(
                    NuxtLink,
                    {
                        class: 'nav-link',
                        to: buildLink(item.urlSuffix),
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
