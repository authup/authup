/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { FormInputBuildOptionsInput } from '@vue-layout/form-controls';
import { buildFormInputText } from '@vue-layout/form-controls';
import type { VNodeArrayChildren } from 'vue';
import { h } from 'vue';
import type { EntityHeaderOptions, EntityListHeaderSearchOptions, EntityListHeaderTitleOptions } from './type';

export function buildDomainListHeaderSearch(
    ctx: EntityListHeaderSearchOptions,
) {
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

export function buildDomainListHeaderTitle<T>(
    ctx: EntityListHeaderTitleOptions,
) {
    let icon : VNodeArrayChildren = [];
    if (typeof ctx.icon === 'string') {
        icon = [h('i', { class: ctx.icon })];
    } else if (typeof ctx.icon === 'boolean' && ctx.icon) {
        icon = [h('i', { class: 'fa-solid fa-list pe-1' })];
    }

    return h(ctx.tag || 'h6', [
        icon,
        ctx.content || 'Overview',
    ]);
}

export function buildDomainListHeader<T>(
    ctx: EntityHeaderOptions,
) : VNodeArrayChildren {
    const children : VNodeArrayChildren = [];

    if (ctx.title) {
        const options : EntityListHeaderTitleOptions = typeof ctx.title === 'boolean' ? {} :
            ctx.title;

        children.push(buildDomainListHeaderTitle(options));
    }

    if (ctx.search) {
        children.push(buildDomainListHeaderSearch(ctx.search));
    }

    if (children.length > 0) {
        return [h('div', [children])];
    }

    return [];
}
