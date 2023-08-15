/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { FormInputBuildOptionsInput } from '@vue-layout/form-controls';
import { buildFormInputText } from '@vue-layout/form-controls';
import type { VNodeArrayChildren, VNodeChild } from 'vue';
import { h } from 'vue';
import { boolableToObject } from '../../../utils';
import { hasNormalizedSlot, normalizeSlot } from '../../slot';
import { EntityListSlotName } from '../constants';
import type { EntityHeaderOptions, EntityListHeaderSearchOptions, EntityListHeaderTitleOptions } from './type';

export function buildDomainListHeaderSearch(
    ctx: EntityListHeaderSearchOptions,
) {
    if (hasNormalizedSlot(EntityListSlotName.HEADER_SEARCH, ctx.slots)) {
        return normalizeSlot(EntityListSlotName.HEADER_SEARCH, {
            load: ctx.load,
            busy: ctx.busy,
        }, ctx.slots);
    }

    ctx.icon = ctx.icon ?? true;
    ctx.iconPosition = ctx.iconPosition ?? 'start';

    const options : FormInputBuildOptionsInput = {};

    if (ctx.icon) {
        if (ctx.iconPosition === 'start') {
            options.groupPrepend = true;
            options.groupPrependContent = h('i', {
                class: 'fa fa-search',
            });
        } else {
            options.groupAppend = true;
            options.groupAppendContent = h('i', {
                class: 'fa fa-search',
            });
        }
    }

    return buildFormInputText({
        type: 'text',
        onChange: (text: string) => {
            ctx.load(text);
        },
        label: false,
        ...options,
    });
}

export function buildDomainListHeaderTitle(
    ctx: EntityListHeaderTitleOptions,
) {
    let iconClassName: string | undefined;
    if (typeof ctx.icon === 'string') {
        iconClassName = ctx.icon;
    } else if (typeof ctx.icon === 'boolean' && ctx.icon) {
        iconClassName = 'fa-solid fa-list';
    }

    if (hasNormalizedSlot(EntityListSlotName.HEADER_TITLE, ctx.slots)) {
        return normalizeSlot(EntityListSlotName.HEADER_TITLE, {
            icon: iconClassName,
        }, ctx.slots);
    }

    let icon : VNodeArrayChildren = [];

    if (iconClassName) {
        icon = [
            h(
                'i',
                { class: [ctx.icon, 'pe-1'] },
            ),
        ];
    }

    let content : VNodeChild | undefined;
    if (typeof ctx.content === 'function') {
        content = ctx.content();
    } else {
        content = ctx.content;
    }

    return h(ctx.tag || 'h6', [
        icon,
        content || 'Overview',
    ]);
}

export function buildDomainListHeader(
    ctx: EntityHeaderOptions,
) : VNodeArrayChildren {
    const children : VNodeArrayChildren = [];

    if (ctx.title) {
        const options = boolableToObject(ctx.title);
        options.slots = ctx.slots;
        children.push(buildDomainListHeaderTitle(options));
    }

    if (ctx.search) {
        const options = ctx.search;
        options.slots = ctx.slots;
        children.push(buildDomainListHeaderSearch(options));
    }

    if (children.length > 0) {
        return [h('div', [children])];
    }

    return [];
}
