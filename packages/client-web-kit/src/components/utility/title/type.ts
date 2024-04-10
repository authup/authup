/*
 * Copyright (c) 2023-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Slots, VNodeChild } from 'vue';

export type TitleOptionsInput = {
    slots?: Slots,
    icon?: boolean,
    iconClass?: string,
    iconPosition?: 'start' | 'end',
    tag?: string,
    text?: VNodeChild | (() => VNodeChild)
};
export type TitleOptions = TitleOptionsInput;

export type TitleSlotProps = Omit<TitleOptionsInput, 'text' | 'slots'>;
