/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * The trusted-proxy client-certificate header contracts.
 *
 * Declared here rather than in server-core's request layer because the
 * `certificateSource` key's zod type is built from it, and the configuration
 * document must be describable without importing the service that consumes it.
 * server-core's request layer imports it back.
 */
export const CERTIFICATE_SOURCES = [
    'disabled',
    'standard',
    'forwarded',
] as const;

/**
 * Default retention for persisted security events in days (hosted-provider
 * posture, Okta-parity; raise via eventLogRetentionDays /
 * EVENT_LOG_RETENTION_DAYS, 0 = keep forever).
 *
 * It is the `eventLogRetentionDays` default, so it lives with the key;
 * server-core's event module imports it back.
 */
export const EVENT_LOG_RETENTION_DAYS_DEFAULT = 90;
