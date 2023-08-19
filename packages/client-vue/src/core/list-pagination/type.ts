/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ListLoadFn } from '@vue-layout/list-controls';
import type { ListQuery } from '../list';

export type ListPaginationOptions<T> = {
    busy: boolean,
    meta: ListQuery<T>,
    load: ListLoadFn<ListQuery<T>>,
    total: number
};
