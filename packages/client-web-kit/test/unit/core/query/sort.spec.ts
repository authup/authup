/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Sorts, defineSorts } from '@rapiq/core';
import { describe, expect, it } from 'vitest';
import { isQuerySortedDescByDate } from '../../../../src/core/query';

describe('isQuerySortedDescByDate', () => {
    it('detects a descending date sort', () => {
        expect(isQuerySortedDescByDate(defineSorts({ createdAt: 'DESC' }))).toBe(true);
        expect(isQuerySortedDescByDate(defineSorts({ updatedAt: 'DESC' }))).toBe(true);
        expect(isQuerySortedDescByDate(defineSorts({ name: 'ASC', createdAt: 'DESC' }))).toBe(true);
    });

    it('rejects ascending, non-date and empty sorts', () => {
        expect(isQuerySortedDescByDate(defineSorts({ createdAt: 'ASC' }))).toBe(false);
        expect(isQuerySortedDescByDate(defineSorts({ name: 'DESC' }))).toBe(false);
        expect(isQuerySortedDescByDate(new Sorts())).toBe(false);
    });
});
