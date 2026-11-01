/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EntityConflictError, EntityNotFoundError } from '@authup/errors';
import type { StaleRowRetryOptions } from './types.ts';

const STALE_ROW_ATTEMPTS = 3;

/**
 * Aborts a write transaction whose locked row is not the row the request
 * authorized against. Never leaves retryOnStaleRow.
 */
export class StaleRowSignal extends Error {
    constructor() {
        super('The row changed between its authorization and its write.');
    }
}

function isColumnValue(value: unknown): boolean {
    return value === null || typeof value !== 'object';
}

/**
 * Throws a StaleRowSignal when a column differs between the snapshot and the
 * current row. updatedAt moves with every write, and a relation loaded onto
 * a row is no column.
 */
export function assertRowUnchanged(
    snapshot: Record<string, any>,
    current: Record<string, any>,
): void {
    const keys = new Set([...Object.keys(snapshot), ...Object.keys(current)]);

    for (const key of keys) {
        if (
            key === 'updatedAt' ||
            !isColumnValue(snapshot[key]) ||
            !isColumnValue(current[key])
        ) {
            continue;
        }

        if (current[key] !== snapshot[key]) {
            throw new StaleRowSignal();
        }
    }
}

/**
 * Runs an authorize-then-write attempt against the row, and again against a
 * fresh read whenever the attempt's transaction found the row changed. The
 * authorization stays outside the transaction (#3526) and is still taken on
 * the row the write lands on.
 */
export async function retryOnStaleRow<T, R>(
    options: StaleRowRetryOptions<T>,
    fn: (row: T) => Promise<R>,
): Promise<R> {
    const attempts = options.attempts ?? STALE_ROW_ATTEMPTS;

    let { row } = options;

    for (let attempt = 1; ; attempt++) {
        try {
            return await fn(row);
        } catch (e) {
            if (!(e instanceof StaleRowSignal)) {
                throw e;
            }

            if (attempt >= attempts) {
                throw new EntityConflictError('The entity is being changed concurrently, try again.');
            }
        }

        const fresh = await options.reread();

        if (!fresh) {
            throw new EntityNotFoundError();
        }

        row = fresh;
    }
}
