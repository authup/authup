/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    MongoQuery,
} from '@ucast/mongo2js';
import type { PolicyBase } from '../../types';

export type AttributesPolicyQuery<T> = MongoQuery<T>;

export interface AttributesPolicy<
    T extends Record<string, any> = Record<string, any>,
> extends PolicyBase {
    query: AttributesPolicyQuery<T>
}
