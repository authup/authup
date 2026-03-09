/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from '@authup/kit';
import type { OrchestratedToast } from 'bootstrap-vue-next';
import { useToastController } from 'bootstrap-vue-next';

export function useToast() {
    const toast = useToastController();

    return {
        hide(el: symbol) {
            if (typeof toast.remove !== 'undefined') {
                toast.remove(el);
            }
        },
        show(
            el: string | OrchestratedToast,
            options: OrchestratedToast = {},
        ) {
            if (typeof toast.show === 'undefined') {
                return Symbol('');
            }

            if (isObject(el)) {
                el.pos = el.pos || 'top-center';
                return toast.show({
                    props: el,
                });
            }

            if (options) {
                options.pos = options.pos || 'top-center';
            }

            return toast.show({
                props: {
                    ...(options || {}),
                    body: el,
                },
            });
        },
    };
}
