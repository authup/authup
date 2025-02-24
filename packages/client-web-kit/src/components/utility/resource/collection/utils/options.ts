/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { merge } from 'smob';
import type { ResourceCollectionRenderOptions, ResourceCollectionVProps } from '../types';

function mergeListOption<T extends boolean | Record<string, any> | undefined>(
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

export function mergeListOptions<T>(
    props: ResourceCollectionVProps<T>,
    defaults: Partial<ResourceCollectionRenderOptions<T>>,
) : ResourceCollectionRenderOptions<T> {
    const output : Partial<ResourceCollectionRenderOptions<T>> = {
        body: defaults.body,
        item: defaults.item,
    };

    output.header = mergeListOption(props.header, defaults.header);
    output.noMore = mergeListOption(props.noMore, defaults.noMore);
    output.footer = mergeListOption(props.footer, defaults.footer);
    output.loading = mergeListOption(props.loading, defaults.loading);

    return output as ResourceCollectionRenderOptions<T>;
}
