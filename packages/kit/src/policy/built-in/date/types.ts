/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyBase } from '../../types';
import type { BuiltInPolicyType } from '../constants';

export interface DatePolicy extends PolicyBase {
    type: `${BuiltInPolicyType.DATE}`,

    start?: string | Date | number,

    end?: string | Date | number,
}

export type DatePolicyOptions = Omit<DatePolicy, 'type'>;
