/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { buildPagination as _buildPagination } from '@vuecs/pagination';
import type { PaginationOptions } from './type';

export function buildPagination(
    ctx: PaginationOptions,
) {
    return _buildPagination({
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
