/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuildInput } from '@trapi/query';
import { PaginationProperties } from './Pagination';

export type ComponentListData<T = Record<string, any>> = {
    busy: boolean,
    items: T[],
    q: string,
    meta: PaginationProperties,
    itemBusy: boolean
};

export type ComponentListItemData<T = Record<string, any>> = {
    busy: boolean,
    item: T | null,
    loaded?: boolean
};

export type ComponentListProperties<T = Record<string, any>> = {
    query?: BuildInput<T>,

    withHeader?: boolean,
    withSearch?: boolean,
    withPagination?: boolean,

    loadOnInit?: boolean,
};

export type ComponentFormData<T = Record<string, any>> = {
    form: Partial<T>,
    busy: false,

    item?: T | null,
    loaded?: boolean
};
