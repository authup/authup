/*
 * Copyright (c) 2023-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from 'smob';
import type { SortBuildInput } from 'rapiq';
import { SortDirection } from 'rapiq';

type Data = {
    created_at?: string | Date,
    updated_at?: string | Date,
    [key: string]: any
};
export function isQuerySortedDescByDate<T extends Data>(input: SortBuildInput<T>) : boolean {
    if (Array.isArray(input)) {
        return input.some((el) => isQuerySortedDescByDate(el as SortBuildInput<T>));
    }

    if (isObject(input)) {
        return input.created_at === SortDirection.DESC ||
            input.updated_at === SortDirection.DESC;
    }

    return typeof input === 'string' &&
        (input === '-created_at' || input === '-updated_at');
}
