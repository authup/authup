/*
 * Copyright (c) 2023-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { UUID, V7Generator } from 'uuidv7';

const regexp = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-8][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUUID(input: string) : boolean {
    return regexp.test(input);
}

const UNIX_TS_MS_MAX = 2 ** 48 - 1;

const generator = new V7Generator();

// never reset on a clock rollback: a reset would mint ids below ones already
// handed out, which a cursor over them (the event feed) would skip for good
generator.setRollbackAllowance(UNIX_TS_MS_MAX);

/**
 * RFC 9562 UUIDv7, monotonic within the process, also when the clock steps back.
 */
export function createUUIDv7() : string {
    return generator.generate().toString();
}

/**
 * The smallest UUIDv7 of the given unix millisecond.
 */
export function buildUUIDv7LowerBound(timestamp: number) : string {
    return UUID.fromFieldsV7(timestamp, 0, 0, 0).toString();
}
