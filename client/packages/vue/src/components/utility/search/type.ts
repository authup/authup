/*
 * Copyright (c) 2023-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Slots } from 'vue';

export type SearchLoadFn = (data?: any) => Promise<void> | void;
export type SearchOptionsInput = {
    slots?: Slots,
    icon?: boolean,
    iconPosition?: 'start' | 'end',
    iconClass?: string,
    load?: SearchLoadFn,
    busy?: boolean,
    meta?: Record<string, any>
};

export type SearchSlotProps = Omit<SearchOptionsInput, 'slots'>;
