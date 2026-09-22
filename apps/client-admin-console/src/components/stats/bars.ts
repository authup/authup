/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * The height of an empty bucket: a hairline, so the axis reads as a run of
 * days rather than a gap.
 */
export const BAR_EMPTY_PERCENT = 4;

/**
 * The floor of a bucket holding at least one row, so a day with one row
 * next to a day with a thousand still reads as non-empty.
 */
export const BAR_FILLED_MIN_PERCENT = 8;

/**
 * Bar heights in percent of the strip, proportional to the largest bucket.
 */
export function scaleBarHeights(values: number[]): number[] {
    const max = Math.max(0, ...values);

    return values.map((value) => {
        if (value <= 0 || max <= 0) {
            return BAR_EMPTY_PERCENT;
        }

        return Math.max(BAR_FILLED_MIN_PERCENT, Math.round((value / max) * 100));
    });
}
