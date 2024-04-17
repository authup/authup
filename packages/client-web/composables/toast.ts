/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from '@authup/core-kit';
import type { Toast } from 'bootstrap-vue-next';
import { useToast as _useToast } from 'bootstrap-vue-next';

export function useToast() {
    const toast = _useToast();

    return {
        hide(el: symbol) {
            toast.hide(el);
        },
        show(
            el: string | Toast,
            options?: Omit<Toast, 'body'>,
        ) {
            if (isObject(el)) {
                el.pos = el.pos || 'top-center';
                return toast.show(el);
            }

            if (options) {
                options.pos = options.pos || 'top-center';
            }

            return toast.show(el, options);
        },
    };
}
