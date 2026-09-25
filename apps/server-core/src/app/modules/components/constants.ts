/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Every component ticks once a minute, so five missed ticks in a row.
 */
export const COMPONENT_OVERDUE_AFTER = 5 * 60_000;

/**
 * A pass still running counts as progress until it has run this long: a
 * large batched drain may outlast COMPONENT_OVERDUE_AFTER while working, a
 * query that never returns may not.
 */
export const COMPONENT_HUNG_AFTER = 30 * 60_000;
