/*
 * Copyright (c) 2023-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from 'smob';
import type { ISorts, SortsBuildInput } from '@rapiq/core';
import { SortDirection } from '@rapiq/core';

type Data = {
    createdAt?: string | Date,
    updatedAt?: string | Date,
    [key: string]: any
};

function isSortsNode(input: unknown) : input is ISorts {
    return isObject(input) &&
        typeof (input as ISorts).accept === 'function' &&
        Array.isArray((input as ISorts).value);
}

export function isQuerySortedDescByDate<T extends Data>(
    input: SortsBuildInput<T> | ISorts,
) : boolean {
    if (isSortsNode(input)) {
        return input.value.some(
            (sort) => (sort.name === 'createdAt' || sort.name === 'updatedAt') &&
                sort.operator === SortDirection.DESC,
        );
    }

    if (Array.isArray(input)) {
        return input.some((el) => isQuerySortedDescByDate(el as SortsBuildInput<T>));
    }

    if (isObject(input)) {
        return input.createdAt === SortDirection.DESC ||
            input.updatedAt === SortDirection.DESC;
    }

    return typeof input === 'string' &&
        (input === '-createdAt' || input === '-updatedAt');
}
