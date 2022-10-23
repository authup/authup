/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineComponent } from 'vue';
import Login from './Login.svg';

export default defineComponent({
    props: {
        width: {
            type: [Number, String],
            default: 750,
        },
        height: {
            type: [Number, String],
            default: 500,
        },
    },
    setup(props) {
        return () => h('img', {
            src: Login,
            width: props.width,
            height: props.height,
            style: {
                maxWidth: '100%',
            },
        });
    },
});
