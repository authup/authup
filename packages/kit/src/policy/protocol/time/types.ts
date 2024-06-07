/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyType } from '../../constants';
import type { PolicyBase } from '../../types';
import type { TimePolicyInterval } from './constants';

export interface TimePolicy extends PolicyBase {
    type: `${PolicyType.TIME}`,

    /**
     * Format: HH:MM
     */
    start?: string,

    /**
     * Format HH:MM
     */
    end?: string,

    interval?: TimePolicyInterval,

    /**
     *  0 (Sunday) - 6 (Saturday)
     */
    dayOfWeek?: number,

    /**
     * 1 - 31
     */
    dayOfMonth?: number,

    /**
     * 1 - 365
     */
    dayOfYear?: number,
}

export type TimePolicyEvalContext = Omit<TimePolicy, 'type'>;

// date policy: startDate, endDate, ...
