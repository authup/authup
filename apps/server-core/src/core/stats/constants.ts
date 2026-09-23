/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * The most buckets one statistic answers, whatever the unit: 31 days of
 * hours, two years of days. Bounds both the statement (one row per bucket
 * per group) and the response.
 */
export const STATS_MAX_BUCKETS = 744;

/**
 * How long a statistic is served from the cache (ms). The grant caches take
 * the same window, so a reach change reaches the dashboard no later than it
 * reaches the list.
 */
export const STATS_CACHE_TTL = 60_000;
