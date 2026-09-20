/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { compileFilters } from '@rapiq/adapter-memory';
import type { IFilter, IFilters } from '@rapiq/core';
import {
    eq,
    or,
    startsWith,
} from '@rapiq/core';
import { describe, expect, it } from 'vitest';
import { buildPathScopeCondition } from '../../../src/core';

/** The condition as a row predicate, the way an adapter lowers it. */
const predicate = (path: string) => compileFilters(
    buildPathScopeCondition(path) as IFilter | IFilters,
    { caseSensitive: true },
);

describe('core/path', () => {
    it('should match the folder itself and every folder below it', () => {
        expect(buildPathScopeCondition('sales')).toEqual(
            or(eq('path', 'sales'), startsWith('path', 'sales/')),
        );
    });

    // The sibling-safety property, EVALUATED rather than read off the encoded
    // string: an assertion on the encoding passes against a condition that
    // does not actually exclude `sales2`, which is the one row the separator
    // in the prefix leg exists to keep out.
    it('should reach the subtree without reaching a sibling sharing the prefix', () => {
        const matches = predicate('sales');

        expect(matches({ path: 'sales' })).toBeTruthy();
        expect(matches({ path: 'sales/berlin' })).toBeTruthy();
        expect(matches({ path: 'sales2' })).toBeFalsy();
        expect(matches({ path: 'sales2/berlin' })).toBeFalsy();
    });

    it('should reach a nested folder from a nested scope', () => {
        const matches = predicate('sales/berlin');

        expect(matches({ path: 'sales/berlin' })).toBeTruthy();
        expect(matches({ path: 'sales/berlin/east' })).toBeTruthy();
        expect(matches({ path: 'sales' })).toBeFalsy();
        expect(matches({ path: 'sales/berlin2' })).toBeFalsy();
    });
});
