/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ListLoadFn, ListLoadMeta } from '@vue-layout/list-controls';
import type { Ref } from 'vue';

export type DomainListFooterPaginationOptions = {
    busy: Ref<boolean> | boolean,
    meta: Ref<ListLoadMeta>,
    load: ListLoadFn
};

export type DomainListFooterOptions = {
    pagination?: DomainListFooterPaginationOptions
};
