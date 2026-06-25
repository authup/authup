/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { h } from 'vue';
import type { ButtonSize } from '@vuecs/button';
import { VCButton } from '@vuecs/button';
import { VCIcon } from '@vuecs/icon';
import { DEFAULT_BUTTON_SIZE } from '../../../core';

type ToggleButtonOptions = {
    value: boolean,
    isBusy: boolean,
    changed: (value: boolean) => void,
    size?: ButtonSize,
};
export function renderToggleButton(
    options: ToggleButtonOptions,
) {
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
        size: options.size ?? DEFAULT_BUTTON_SIZE,
        color,
        disabled: options.isBusy,
        onClick($event: any) {
            $event.preventDefault();

            options.changed(!options.value);
        },
    }, { leading: () => h(VCIcon, { name: iconName }) });
}
