/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { unref } from 'vue';
import type { Ref, ToRefs } from 'vue';
import type { DomainListBuilderTemplateOptions, DomainListProps } from '../type';

function merge<T>(primary: T | Ref<T>, secondary: T) : T | undefined {
    if (typeof primary !== 'undefined') {
        return unref(primary);
    }

    return secondary;
}

export function mergeDomainListOptions<T extends Record<string, any>>(
    props: ToRefs<DomainListProps<T>>,
    defaults: Partial<DomainListBuilderTemplateOptions<T>>,
) : DomainListBuilderTemplateOptions<T> {
    const output : Partial<DomainListBuilderTemplateOptions<T>> = {
        items: defaults.items ?? true,
    };

    output.headerSearch = merge(props.headerSearch, defaults.headerSearch);
    output.headerTitle = merge(props.headerTitle, defaults.headerTitle);

    output.noMore = merge(defaults.noMore, defaults.noMore);

    output.footerPagination = merge(props.footerPagination, defaults.footerPagination);

    return output as DomainListBuilderTemplateOptions<T>;
}
