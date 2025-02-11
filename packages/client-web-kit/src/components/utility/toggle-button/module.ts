/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { h } from 'vue';

type ToggleButtonOptions = {
    value: boolean,
    isBusy: boolean,
    changed: (value: boolean) => void
};
export function renderToggleButton(
    options: ToggleButtonOptions,
) {
    return h('button', {
        class: ['btn btn-xs', {
            'btn-dark': options.isBusy,
            'btn-success': !options.isBusy && !options.value,
            'btn-danger': !options.isBusy && options.value,
        }],
        disabled: options.isBusy,
        onClick($event: any) {
            $event.preventDefault();

            options.changed(!options.value);
        },
    }, [
        h('i', {
            class: ['fa', {
                'fa-question': options.isBusy,
                'fa-plus': !options.isBusy && !options.value,
                'fa-minus': !options.isBusy && options.value,
            }],
        }),
    ]);
}
