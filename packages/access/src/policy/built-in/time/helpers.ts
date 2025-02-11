/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TimePolicyInterval } from './constants';

export function isIntervalForDayOfWeek(
    interval: string,
) {
    return interval === TimePolicyInterval.WEEKLY ||
        interval === TimePolicyInterval.MONTHLY ||
        interval === TimePolicyInterval.YEARLY;
}

export function isIntervalForDayOfMonth(
    interval: string,
) {
    return interval === TimePolicyInterval.MONTHLY ||
    interval === TimePolicyInterval.YEARLY;
}

export function isIntervalForDayOfYear(
    interval: string,
) {
    return interval === TimePolicyInterval.YEARLY;
}
