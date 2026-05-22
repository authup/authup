/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { VCPagination } from '@vuecs/pagination';
import { h } from 'vue';
import type { VNodeChild } from 'vue';
import type { PaginationOptions } from './type';

export function buildPagination(
    ctx: PaginationOptions,
): VNodeChild {
    const total = ctx.meta?.total ?? ctx.total ?? 0;
    const limit = ctx.meta?.pagination?.limit ?? 0;
    const offset = ctx.meta?.pagination?.offset ?? 0;
    const busy = ctx.meta?.busy ?? ctx.busy ?? false;

    return h(VCPagination, {
        total,
        limit,
        offset,
        busy,
        'onUpdate:page': (page: number) => {
            const nextOffset = (page - 1) * (limit || 1);
            void ctx.load?.({
                ...ctx.meta,
                pagination: {
                    limit,
                    offset: nextOffset,
                },
            });
        },
    });
}
