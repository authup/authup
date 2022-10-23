/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineComponent, toRefs } from 'vue';
import Account from './Account.svg';

export default defineComponent({
    props: {
        width: {
            type: [Number, String],
            default: 300,
        },
        height: {
            type: [Number, String],
            default: 200,
        },
    },
    setup(props) {
        return () => h('img', {
            src: Account,
            width: props.width,
            height: props.height,
            style: {
                maxWidth: '100%',
            },
        });
    },
});
