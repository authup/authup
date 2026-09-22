/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import {
    BAR_EMPTY_PERCENT,
    BAR_FILLED_MIN_PERCENT,
    scaleBarHeights,
} from '../../src/components/stats/bars';

describe('src/components/stats/bars', () => {
    it('scales every bar against the largest bucket', () => {
        expect(scaleBarHeights([1, 5, 10])).toEqual([10, 50, 100]);
    });

    it('renders an empty bucket as the hairline', () => {
        expect(scaleBarHeights([0, 4, 0])).toEqual([BAR_EMPTY_PERCENT, 100, BAR_EMPTY_PERCENT]);
    });

    it('renders an empty window as hairlines only', () => {
        expect(scaleBarHeights([0, 0])).toEqual([BAR_EMPTY_PERCENT, BAR_EMPTY_PERCENT]);
        expect(scaleBarHeights([])).toEqual([]);
    });

    it('keeps a bucket holding rows above the floor next to a far larger one', () => {
        expect(scaleBarHeights([1, 1000])).toEqual([BAR_FILLED_MIN_PERCENT, 100]);
    });
});
