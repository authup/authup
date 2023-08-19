/*
 * Copyright (c) 2023-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import type { FormInputBuildOptionsInput } from '@vue-layout/form-controls';
import { buildFormInputText } from '@vue-layout/form-controls';
import type { VNodeChild } from 'vue';
import { h } from 'vue';
import type { ListQuery } from '../list';
import { hasNormalizedSlot, normalizeSlot } from '../slot';
import { ListSearchSlotName } from './constants';
import type { ListSearchOptionsInput } from './type';

export function buildListSearch<T>(
    ctx: ListSearchOptionsInput<T>,
) {
    ctx.icon = ctx.icon ?? true;
    ctx.iconClass = ctx.iconClass || 'fa fa-search';
    ctx.iconPosition = ctx.iconPosition ?? 'start';

    if (hasNormalizedSlot(ListSearchSlotName.DEFAULT, ctx.slots)) {
        return normalizeSlot(ListSearchSlotName.DEFAULT, {
            load: ctx.load,
            busy: ctx.busy,
            icon: ctx.icon,
            iconClass: ctx.iconClass,
            iconPosition: ctx.iconPosition,
        }, ctx.slots);
    }

    let iconContent : VNodeChild | undefined;
    if (hasNormalizedSlot(ListSearchSlotName.ICON)) {
        iconContent = normalizeSlot(ListSearchSlotName.ICON, {}, ctx.slots);
    }

    const options: FormInputBuildOptionsInput = {};

    if (ctx.icon) {
        if (ctx.iconPosition === 'start') {
            options.groupPrepend = true;
            if (iconContent) {
                options.groupPrependContent = iconContent;
            } else {
                options.groupPrependContent = h('i', {
                    class: ctx.iconClass,
                });
            }
        } else {
            options.groupAppend = true;
            if (iconContent) {
                options.groupAppendContent = iconContent;
            } else {
                options.groupAppendContent = h('i', {
                    class: ctx.iconClass,
                });
            }
        }
    }

    return buildFormInputText({
        type: 'text',
        onChange: (text: string) => {
            if (!ctx.load) {
                return;
            }

            ctx.load({
                filters: {
                    name: text.length > 0 ? `~${text}` : text as any,
                },
                pagination: {
                    offset: 0,
                },
            } as ListQuery<T>);
        },
        props: {
            placeholder: '...',
        },
        label: false,
        ...options,
    });
}
