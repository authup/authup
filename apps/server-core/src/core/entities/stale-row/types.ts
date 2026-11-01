/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type StaleRowRetryOptions<T> = {
    /**
     * The row the first attempt authorizes against.
     */
    row: T,
    /**
     * Reads the row again after an attempt found it changed. It runs after
     * the aborted transaction, so it may use the pool.
     */
    reread: () => Promise<T | null>,
    attempts?: number,
};
