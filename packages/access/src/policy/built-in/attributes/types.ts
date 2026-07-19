/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { MongoFiltersParserInput } from '@rapiq/parser-mongo';
import type { BasePolicy } from '../../types';

export type AttributesPolicyQuery<
    T extends Record<string, any> = Record<string, any>,
> = MongoFiltersParserInput<T>;

export interface AttributesPolicy<
    T extends Record<string, any> = Record<string, any>,
> extends BasePolicy {
    query: AttributesPolicyQuery<T>
}
