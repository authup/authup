/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Ref } from 'vue';

export type DomainListHeaderTitleOptionsInput = {
    icon?: boolean | string,
    tag?: string,
    content?: string
};
export type DomainListHeaderTitleOptions = DomainListHeaderTitleOptionsInput;

export type DomainListHeaderSearchOptionsInput = {
    icon?: boolean,
    iconPosition?: 'start' | 'end'
};

export type DomainListHeaderSearchOptions = DomainListHeaderSearchOptionsInput & {
    busy: Ref<boolean> | boolean,
    load: (value: string) => any
};

export type ListHeaderOptions = {
    title?: DomainListHeaderTitleOptions | boolean,
    search?: DomainListHeaderSearchOptions
};
