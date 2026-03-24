/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from '@authup/kit';
import type { ToastOrchestratorParam } from 'bootstrap-vue-next';
import { useToast as useBaseToast } from 'bootstrap-vue-next';

export function useToast() {
    const toast = useBaseToast();

    return {
        hide(el: symbol) {
            const item = toast.store.value.find((i) => i._self === el);
            if (item) {
                item.promise.resolve(new Event('hide') as any);
            }
        },
        show(
            el: string | ToastOrchestratorParam,
            options: ToastOrchestratorParam = {},
        ) {
            if (typeof toast.show === 'undefined') {
                return Symbol('');
            }

            if (isObject(el)) {
                el.position = el.position || 'top-center';
                return toast.show({
                    props: el,
                });
            }

            if (options) {
                options.position = options.position || 'top-center';
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
