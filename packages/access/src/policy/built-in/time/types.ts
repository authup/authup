/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BasePolicy } from '../../types';
import type { TimePolicyInterval } from './constants';

export interface TimePolicy extends BasePolicy {
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
    day_of_week?: number,

    /**
     * 1 - 31
     */
    day_of_month?: number,

    /**
     * 1 - 365
     */
    day_of_year?: number,
}
