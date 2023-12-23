/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { buildPagination } from '@vuecs/pagination';
import type { ListPaginationOptions } from './type';

export function buildListPagination<T>(
    ctx: ListPaginationOptions<T>,
) {
    return buildPagination({
        load: (pagination) => ctx.load({
            ...ctx.meta,
            pagination: {
                limit: pagination.limit,
                offset: pagination.offset,
            },
        }),
        total: ctx.meta?.total ?? ctx.total ?? 0,
        limit: ctx.meta?.pagination?.limit ?? 0,
        offset: ctx.meta?.pagination?.offset ?? 0,
        busy: ctx.meta?.busy ?? ctx.busy,
    });
}
