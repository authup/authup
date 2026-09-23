/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

// The default retention for persisted security events is declared with the
// key it is the default of (eventLogRetentionDays, in
// `@authup/server-config`), and re-exported here for this module's own
// consumers.
export { EVENT_LOG_RETENTION_DAYS_DEFAULT } from '@authup/server-config';

/**
 * Rows removed per statement by the retention sweep. The sweep runs every
 * minute on every replica, and the first one after a retention change (or the
 * day a full retention window first matures) can match millions of rows. A
 * single unbounded DELETE would then be one long transaction, issued
 * concurrently by every replica. Batching keeps each statement bounded; the
 * sweep still drains by looping.
 */
export const EVENT_RETENTION_SWEEP_BATCH_SIZE = 1000;

/**
 * Column bound for the denormalized actor name. Shared by the write boundary
 * (EventService.record truncates to it) and every reader that matches stored
 * rows by actor name (the login throttle) so the two cannot drift — an
 * untruncated lookup key never matches its own truncated rows.
 */
export const EVENT_ACTOR_NAME_MAX_LENGTH = 128;
