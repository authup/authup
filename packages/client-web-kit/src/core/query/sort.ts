/*
 * Copyright (c) 2023-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ISorts } from '@rapiq/core';
import { SortDirection } from '@rapiq/core';

export function isQuerySortedDescByDate(input: ISorts) : boolean {
    return input.value.some(
        (sort) => (sort.name === 'createdAt' || sort.name === 'updatedAt') &&
            sort.operator === SortDirection.DESC,
    );
}
