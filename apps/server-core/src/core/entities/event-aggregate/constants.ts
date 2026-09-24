/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * The mutex a day's recompute holds against every other. The name must stay
 * STABLE across releases: replicas of two versions must still exclude each
 * other.
 */
export const EVENT_AGGREGATE_DATABASE_LOCK = 'authup:event-aggregate';

/**
 * How many missing days one tick fills while walking back toward the oldest
 * raw event.
 */
export const EVENT_AGGREGATE_BACKFILL_DAYS = 7;
