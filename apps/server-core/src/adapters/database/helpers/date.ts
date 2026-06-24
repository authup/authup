/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import type { ValueTransformer } from 'typeorm';

/**
 * Normalize datetime column reads to ISO-8601 strings.
 *
 * TypeORM hydrates @CreateDateColumn / @UpdateDateColumn / datetime columns to
 * Date objects in-process (pg/mysql2 return Date natively; sqlite datetime
 * strings are normalized to Date by the driver before this transformer runs).
 * Without this transformer a string-typed timestamp field would still be a Date
 * at runtime server-side. Applying it makes the runtime value match the declared
 * `string` type, so there is a single timestamp representation across backend and
 * frontend with no per-consumer re-hydration.
 */
export const dateToISOStringTransformer : ValueTransformer = {
    to(value) {
        return value;
    },
    from(value) {
        return value instanceof Date ? value.toISOString() : value;
    },
};
