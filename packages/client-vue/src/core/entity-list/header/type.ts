/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Ref, Slots, VNodeChild } from 'vue';

export type EntityListHeaderTitleOptionsInput = {
    slots?: Slots,
    icon?: boolean | string,
    tag?: string,
    content?: VNodeChild | (() => VNodeChild)
};
export type EntityListHeaderTitleOptions = EntityListHeaderTitleOptionsInput;

export type EntityListHeaderSearchOptionsInput = {
    slots?: Slots,
    icon?: boolean,
    iconPosition?: 'start' | 'end'
};

export type EntityListHeaderSearchOptions = EntityListHeaderSearchOptionsInput & {
    busy: boolean,
    load: (value: string) => any
};

export type EntityHeaderOptions = {
    slots?: Slots,
    title?: EntityListHeaderTitleOptions | boolean,
    search?: EntityListHeaderSearchOptions
};
