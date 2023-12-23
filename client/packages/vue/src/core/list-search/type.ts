/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ListLoadFn } from '@vuecs/list-controls';
import type { Slots } from 'vue/dist/vue';
import type { ListMeta } from '../list';

export type ListSearchOptionsInput<T> = {
    slots?: Slots,
    icon?: boolean,
    iconPosition?: 'start' | 'end',
    iconClass?: string,
    load?: ListLoadFn<ListMeta<T>>,
    busy?: boolean,
    meta?: ListMeta<T>
};

export type ListSearchSlotProps<T> = Omit<ListSearchOptionsInput<T>, 'slots'>;

export type ListSearchOptions<T> = ListSearchOptionsInput<T> & {
    busy?: boolean,
    load?: ListLoadFn<ListMeta<T>>
};
