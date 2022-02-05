/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BvModal, BvToast } from 'bootstrap-vue';

declare module 'vue/types/vue' {
    interface Vue {
        readonly $bvModal: BvModal
        readonly $bvToast: BvToast
    }
}
