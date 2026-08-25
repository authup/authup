/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineComponent, h } from 'vue';
import Logo from './Logo.svg';

export default defineComponent({
    props: {
        width: {
            type: [Number, String],
            default: 32,
        },
        height: {
            type: [Number, String],
            default: 32,
        },
    },
    setup(props) {
        return () => h('img', {
            src: Logo,
            alt: 'Authup logo',
            width: props.width,
            height: props.height,
            style: { maxWidth: '100%' },
        });
    },
});
