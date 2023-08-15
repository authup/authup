/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { merge } from 'smob';
import type { EntityListBuilderTemplateOptions, EntityListProps } from '../type';

function mergeOptions<T extends boolean | Record<string, any> | undefined>(
    primary: T,
    secondary: T,
) : T {
    if (typeof secondary === 'undefined') {
        return primary;
    }

    if (typeof primary === 'undefined') {
        return secondary;
    }

    if (typeof primary === 'boolean' && !primary) {
        return primary;
    }

    const primaryRecord = typeof primary === 'boolean' ? {} : primary;
    const secondaryRecord = typeof secondary === 'boolean' ? {} : secondary;

    return merge(primaryRecord, secondaryRecord) as T;
}

export function mergeEntityListOptions<T>(
    props: EntityListProps<T>,
    defaults: Partial<EntityListBuilderTemplateOptions<T>>,
) : EntityListBuilderTemplateOptions<T> {
    const output : Partial<EntityListBuilderTemplateOptions<T>> = {
        body: mergeOptions(props.body, defaults.body),
        item: mergeOptions(props.item, defaults.item),
    };

    output.header = mergeOptions(props.header, defaults.header);
    output.headerSearch = mergeOptions(props.headerSearch, defaults.headerSearch);
    output.headerTitle = mergeOptions(props.headerTitle, defaults.headerTitle);

    output.noMore = mergeOptions(props.noMore, defaults.noMore);

    output.footer = mergeOptions(props.footer, defaults.footer);
    output.footerPagination = mergeOptions(props.footerPagination, defaults.footerPagination);

    return output as EntityListBuilderTemplateOptions<T>;
}
