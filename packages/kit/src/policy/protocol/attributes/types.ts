/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { MongoQuery } from '@ucast/mongo2js';
import type { PolicyType } from '../../constants';
import type { PolicyBase } from '../../types';

export interface AttributesPolicy<
    T extends Record<string, any> = Record<string, any>,
> extends PolicyBase {
    type: `${PolicyType.ATTRIBUTES}`,

    condition: MongoQuery<T>
}

export type AttributesPolicyEvalContext<
    T extends Record<string, any> = Record<string, any>,
> = Omit<AttributesPolicy<T>, 'type'>;
