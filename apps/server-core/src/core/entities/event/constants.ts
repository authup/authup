/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Default retention for persisted security events in days (hosted-provider
 * posture, Okta-parity; raise via eventLogRetentionDays /
 * EVENT_LOG_RETENTION_DAYS, 0 = keep forever).
 */
export const EVENT_LOG_RETENTION_DAYS_DEFAULT = 90;

/**
 * Column bound for the denormalized actor name. Shared by the write boundary
 * (EventService.record truncates to it) and every reader that matches stored
 * rows by actor name (the login throttle) so the two cannot drift — an
 * untruncated lookup key never matches its own truncated rows.
 */
export const EVENT_ACTOR_NAME_MAX_LENGTH = 128;
