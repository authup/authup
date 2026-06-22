/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { h, resolveComponent } from 'vue';
import { VCButton } from '@vuecs/button';

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
    let color: 'neutral' | 'error' | 'success';
    if (options.isBusy) {
        iconName = 'fa6-solid:question';
        color = 'neutral';
    } else if (options.value) {
        iconName = 'fa6-solid:minus';
        color = 'error';
    } else {
        iconName = 'fa6-solid:plus';
        color = 'success';
    }

    return h(VCButton, {
        size: 'sm',
        color,
        disabled: options.isBusy,
        onClick($event: any) {
            $event.preventDefault();

            options.changed(!options.value);
        },
    }, () => [
        h(VCIcon, { name: iconName }),
    ]);
}
