/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PaginationMeta } from '@vue-layout/pagination';
import { buildPagination } from '@vue-layout/pagination';
import type { VNodeArrayChildren } from 'vue';
import { h } from 'vue';
import type { DomainListFooterOptions, DomainListFooterPaginationOptions } from './type';

export function buildDomainListFooterPagination<T>(
    ctx: DomainListFooterPaginationOptions,
) {
    return buildPagination({
        load: ctx.load as (meta: PaginationMeta) => any,
        total: ctx.meta?.value.total || 0,
        limit: ctx.meta?.value.limit || 0,
        offset: ctx.meta?.value.offset || 0,
        busy: ctx.busy,
    });
}

export function buildDomainListFooter<T>(
    ctx: DomainListFooterOptions,
) : VNodeArrayChildren {
    const children : VNodeArrayChildren = [];

    if (ctx.pagination) {
        children.push(buildDomainListFooterPagination(ctx.pagination));
    }

    if (children.length > 0) {
        return [h('div', [children])];
    }

    return [];
}
