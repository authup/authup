/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { MaybeRef, VNodeArrayChildren } from 'vue';
import { h, unref } from 'vue';

type Context<T> = {
    add: () => Promise<any> | any,
    drop: () => Promise<any> | any,
    item: MaybeRef<T>,
    busy: MaybeRef<boolean>
};
export function renderEntityAssignAction<T>(
    ctx: Context<T>,
) {
    let children: VNodeArrayChildren = [];

    const busy = unref(ctx.busy);
    const item = unref(ctx.item);

    if (!busy) {
        children = [
            h('button', {
                class: ['btn btn-xs', {
                    'btn-success': !item,
                    'btn-danger': item,
                }],
                onClick($event: any) {
                    $event.preventDefault();

                    if (item) {
                        return ctx.drop.call(null);
                    }

                    return ctx.add.call(null);
                },
            }, [
                h('i', {
                    class: ['fa', {
                        'fa-plus': !item,
                        'fa-minus': item,
                    }],
                }),
            ]),
        ];
    }

    return h('div', [children]);
}
