/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BvModal, BvToast } from 'bootstrap-vue';
import { Ilingo } from 'ilingo';

declare module '*.vue' {
    import Vue from 'vue';

    export default Vue;
}

declare module 'vue/types/vue' {
    interface VueConstructor {
        $bvModal: BvModal,
        $bvToast: BvToast,
        $ilingo: Ilingo
    }

    interface Vue {
        $bvModal: BvModal,
        $bvToast: BvToast,
        $ilingo: Ilingo
    }
}
