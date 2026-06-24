/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { VCPagination } from '@vuecs/pagination';
import type { PropType } from 'vue';
import { defineComponent, h } from 'vue';

type PaginationLoadFn = (data?: any) => Promise<void> | void;

/**
 * Thin adapter mapping authup's entity-collection footer contract
 * (`{ busy, meta, load }`, where `meta` is rapiq's
 * `{ total, pagination: { limit, offset } }`) onto `<VCPagination>`.
 *
 * `<VCPagination>` is `inline-flex`, so the wrapping `flex justify-center`
 * centers it for every collection footer without each caller adding a
 * wrapper.
 */
export const APagination = defineComponent({
    props: {
        total: { type: Number },
        meta: { type: Object as PropType<Record<string, any>> },
        busy: { type: Boolean },
        load: { type: Function as PropType<PaginationLoadFn> },
    },
    setup(props) {
        return () => {
            const total = props.meta?.total ?? props.total ?? 0;
            const limit = props.meta?.pagination?.limit ?? 0;
            const offset = props.meta?.pagination?.offset ?? 0;
            const busy = props.meta?.busy ?? props.busy ?? false;

            return h('div', { class: 'flex justify-center' }, [
                h(VCPagination, {
                    total,
                    limit,
                    offset,
                    busy,
                    // `hideDisabled` unrenders edge controls (First / Prev
                    // on page 1, Next / Last on the last page) instead of
                    // rendering them disabled.
                    hideDisabled: true,
                    // VCPagination emits `load` with `{ page, offset, limit }`
                    // (NOT `update:page`).
                    onLoad: (payload: { offset: number }) => {
                        void props.load?.({
                            ...props.meta,
                            pagination: {
                                limit,
                                offset: payload.offset,
                            },
                        });
                    },
                }),
            ]);
        };
    },
});
