/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

// One definition for every listener: the consoles answer the same two paths.
export { HEALTH_LIVENESS_PATH, HEALTH_READINESS_PATH } from '@authup/server-console-kit';

export const DATABASE_HEALTH_CHECK_TIMEOUT = 1_000;
export const DATABASE_HEALTH_CHECK_TTL = 1_000;
