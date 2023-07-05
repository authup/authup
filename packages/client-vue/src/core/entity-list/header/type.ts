/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Ref } from 'vue';

export type EntityListHeaderTitleOptionsInput = {
    icon?: boolean | string,
    tag?: string,
    content?: string
};
export type EntityListHeaderTitleOptions = EntityListHeaderTitleOptionsInput;

export type EntityListHeaderSearchOptionsInput = {
    icon?: boolean,
    iconPosition?: 'start' | 'end'
};

export type EntityListHeaderSearchOptions = EntityListHeaderSearchOptionsInput & {
    busy: Ref<boolean> | boolean,
    load: (value: string) => any
};

export type EntityHeaderOptions = {
    title?: EntityListHeaderTitleOptions | boolean,
    search?: EntityListHeaderSearchOptions
};
