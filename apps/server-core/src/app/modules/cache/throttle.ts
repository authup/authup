/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Calls `fn` at most once per `interval` milliseconds and drops the calls in between.
 */
export function throttle<T extends unknown[]>(
    fn: (...args: T) => void,
    interval: number,
    now: () => number = Date.now,
) : (...args: T) => void {
    let calledAt : number | undefined;

    return (...args: T) => {
        const time = now();

        if (calledAt !== undefined && time - calledAt < interval) {
            return;
        }

        calledAt = time;
        fn(...args);
    };
}
