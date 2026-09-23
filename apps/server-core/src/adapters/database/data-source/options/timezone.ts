/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DataSourceOptions } from 'typeorm';
import { pinTimezone } from 'typeorm-extension';

/**
 * Stamp AND read the zone-less timestamp columns in UTC, whatever the
 * timezone of the database server or of the Node process (#3641).
 *
 * `created_at` / `updated_at` are stamped by the database (`now()`,
 * `CURRENT_TIMESTAMP(6)`) in its SESSION timezone, and both drivers read
 * them back in the PROCESS timezone. Everything else in authup (the query
 * adapter binding a filter operand, the login throttle, the statistics
 * buckets) assumes UTC. Pinning only the read side would break an install
 * whose database runs in local time, where `auth_time` (read from a
 * session's `createdAt`) would land in the future and satisfy `max_age` for
 * the length of the offset. `pinTimezone` pins the session, the reader and
 * the `Date` parameter writer together.
 *
 * An explicit setting that contradicts the pin (a non-UTC mysql `timezone`,
 * a postgres `TimeZone`, a custom `typeCast`) is refused with an
 * `OptionsError` rather than half applied. A mysql replication setup has no
 * per-connection hook, so it is left as configured instead of refused.
 */
export function applyUTCTimestamps(options: DataSourceOptions) : DataSourceOptions {
    if (options.type === 'mysql' && typeof options.replication !== 'undefined') {
        return options;
    }

    return pinTimezone(options, 'UTC');
}
