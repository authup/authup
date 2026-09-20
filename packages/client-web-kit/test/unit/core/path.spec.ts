/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { buildQueryString } from '@authup/core-http-kit';
import {
    Query,
    defineFilters,
    eq,
    or,
    startsWith,
} from '@rapiq/core';
import { describe, expect, it } from 'vitest';
import { buildPathScopeCondition } from '../../../src/core';

describe('core/path', () => {
    it('should match the folder itself and every folder below it', () => {
        expect(buildPathScopeCondition('sales')).toEqual(
            or(eq('path', 'sales'), startsWith('path', 'sales/')),
        );
    });

    it('should encode a separator terminated prefix, so a sibling is no descendant', () => {
        // The two calls the collection manager makes to turn a condition into
        // a request: defineFilters over the condition, then the query string.
        const encoded = decodeURIComponent(buildQueryString(new Query({ filters: defineFilters(buildPathScopeCondition('sales')) })));

        expect(encoded).toContain('eq(path,\'sales\')');
        expect(encoded).toContain('startsWith(path,\'sales/\')');

        // `sales2` shares the prefix but is a sibling, not a descendant: the
        // exact leg compares the whole value and the prefix leg carries the
        // separator, so neither admits it. A prefix without the separator
        // would.
        expect(encoded).not.toContain('startsWith(path,\'sales\')');
    });
});
