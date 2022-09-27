/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ToRefs } from 'vue';
import { ListBuilderComponentOptions, ListProps } from '../type';

export function buildListComponentOptions<T extends Record<string, any>>(
    props: ToRefs<ListProps<T>>,
    options: Partial<ListBuilderComponentOptions<T>>,
) : ListBuilderComponentOptions<T> {
    const output : Partial<ListBuilderComponentOptions<T>> = {
        items: options.items ?? true,
    };

    if (props.withHeader.value) {
        output.header = options.header ?? true;
    }

    if (props.withNoMore.value) {
        output.noMore = options.noMore ?? true;
    }

    if (props.withSearch.value) {
        output.search = options.search ?? true;
    }

    if (props.withPagination.value) {
        output.pagination = options.pagination ?? true;
    }

    return output as ListBuilderComponentOptions<T>;
}
