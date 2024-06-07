/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyType } from '../../constants';
import type { PolicyBase } from '../../types';

export interface DatePolicy extends PolicyBase {
    type: `${PolicyType.DATE}`,

    start?: string | Date | number,

    end?: string | Date | number,
}

export type DatePolicyEvalContext = Omit<DatePolicy, 'type'>;
