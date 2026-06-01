/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { h, resolveComponent } from 'vue';

type ToggleButtonOptions = {
    value: boolean,
    isBusy: boolean,
    changed: (value: boolean) => void
};
export function renderToggleButton(
    options: ToggleButtonOptions,
) {
    const VCIcon = resolveComponent('VCIcon');
    let iconName: string;
    if (options.isBusy) {
        iconName = 'fa6-solid:question';
    } else if (options.value) {
        iconName = 'fa6-solid:minus';
    } else {
        iconName = 'fa6-solid:plus';
    }

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
        h(VCIcon, { name: iconName }),
    ]);
}
