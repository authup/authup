/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Rows removed per statement by the session expiry sweep. The sweep runs every
 * minute on every replica, and an instance that has never swept (or one whose
 * session lifetime was just shortened) can match a full backlog at once. A
 * single unbounded DELETE would be one long transaction, issued concurrently
 * by every replica. Batching keeps each statement bounded; the sweep still
 * drains by looping.
 */
export const SESSION_EXPIRY_SWEEP_BATCH_SIZE = 1000;
