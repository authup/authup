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

    // `<VCPagination>` itself is `inline-flex`, so the parent has to
    // center it. Wrap in a flex container so the shim's call sites
    // (every entity-collection footer in client-web) get centered
    // pagination without each caller having to add a wrapper.
    return h('div', { class: 'flex justify-center' }, [
        h(VCPagination, {
            total,
            limit,
            offset,
            busy,
            // VCPagination emits `load` with `{ page, offset, limit }` —
            // NOT `update:page`. Using the wrong event name silently
            // breaks the shim: pagination buttons render but don't paginate.
            onLoad: (payload: { offset: number }) => {
                void ctx.load?.({
                    ...ctx.meta,
                    pagination: {
                        limit,
                        offset: payload.offset,
                    },
                });
            },
        }),
    ]);
}
