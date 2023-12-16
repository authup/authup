/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PropType } from 'vue';
import { defineComponent, toRef } from 'vue';
import { buildDomainEntityNav } from '../composables/domain/enity-nav';
import type { DomainEntityNavItems } from '../composables/domain/enity-nav';

export default defineComponent({
    props: {
        path: {
            type: String,
            required: true,
        },
        items: {
            type: Array as PropType<DomainEntityNavItems>,
            required: true,
        },
        direction: {
            type: String as PropType<'vertical' | 'horizontal'>,
        },
        prevLink: {
            type: Boolean,
        },
    },
    setup(props) {
        const items = toRef(props, 'items');
        const direction = toRef(props, 'direction');
        return () => buildDomainEntityNav(props.path, items.value, {
            direction: direction.value,
            prevLink: props.prevLink,
        });
    },
});
