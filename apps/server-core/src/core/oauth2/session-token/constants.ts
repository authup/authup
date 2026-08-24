/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Rows removed per statement by the session-token expiry sweep. This is the
 * highest-volume table in the schema (one row per issued access token, so one
 * per ~15 minutes per active session), and the sweep runs every minute on
 * every replica. A single unbounded DELETE would be one long transaction,
 * issued concurrently by every replica. Batching keeps each statement
 * bounded; the sweep still drains by looping.
 */
export const SESSION_TOKEN_EXPIRY_SWEEP_BATCH_SIZE = 1000;
