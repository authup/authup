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
    createdAt?: string | Date,
    updatedAt?: string | Date,
    [key: string]: any
};
export function isQuerySortedDescByDate<T extends Data>(input: SortBuildInput<T>) : boolean {
    if (Array.isArray(input)) {
        return input.some((el) => isQuerySortedDescByDate(el as SortBuildInput<T>));
    }

    if (isObject(input)) {
        return input.createdAt === SortDirection.DESC ||
            input.updatedAt === SortDirection.DESC;
    }

    return typeof input === 'string' &&
        (input === '-createdAt' || input === '-updatedAt');
}
