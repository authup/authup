/*
 * Copyright (c) 2023-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import { hasNormalizedSlot, normalizeSlot } from '../../../core';
import type { VNodeChild } from 'vue';
import { h } from 'vue';
import { VCFormInput } from '@vuecs/forms';
import { VCIcon } from '@vuecs/icon';
import { ListSearchSlotName } from './constants';
import type { SearchOptionsInput } from './type';

type Fn = (...args: any[]) => Promise<any> | any;
function debounce<T extends Fn>(func: T, timeout = 200) {
    let timer : ReturnType<typeof setTimeout> | undefined;

    return (...args: Parameters<T>) => {
        clearTimeout(timer);
        timer = setTimeout(() => { func(...args); }, timeout);
    };
}

export function buildListSearch(
    ctx: SearchOptionsInput,
) {
    ctx.icon = ctx.icon ?? true;
    ctx.iconClass = ctx.iconClass || 'fa6-solid:magnifying-glass';
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

    const handle = debounce((text: string) => {
        if (!ctx.load || ctx.meta?.busy || ctx.busy) {
            return Promise.resolve();
        }

        return ctx.load({
            filters: { name: text.length > 0 ? `~${text}` : text as any },
            pagination: { offset: 0 },
        });
    });

    const props: Record<string, any> = {
        type: 'text',
        modelValue: '',
        'onUpdate:modelValue': (text: string) => handle(text),
        placeholder: '...',
    };

    const slots: Record<string, () => VNodeChild> = {};

    if (ctx.icon) {
        const iconClass = ctx.iconClass ?? 'fa6-solid:magnifying-glass';
        const iconNode = () => iconContent ?? h(VCIcon, { name: iconClass });

        if (ctx.iconPosition === 'start') {
            props.groupPrepend = true;
            slots.groupPrepend = iconNode;
        } else {
            props.groupAppend = true;
            slots.groupAppend = iconNode;
        }
    }

    return h(VCFormInput, props, slots);
}
