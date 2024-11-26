/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyBase } from '../../types';
import type { TimePolicyInterval } from './constants';

export interface TimePolicy extends PolicyBase {
    /**
     * Format: HH:MM
     */
    start?: string | number | Date,

    /**
     * Format HH:MM
     */
    end?: string | number | Date,

    /**
     * Interval: daily, weekly, monthly, yearly
     */
    interval?: `${TimePolicyInterval}`,

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
