/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { isPathValid, joinPath, splitPath } from '../../../../src';

describe('domains/path/utils', () => {
    it('should accept a canonical slash path', () => {
        expect(isPathValid('sales')).toBe(true);
        expect(isPathValid('sales/berlin')).toBe(true);
        expect(isPathValid('sources/keycloak')).toBe(true);
    });

    it('should refuse leading, trailing and empty segments', () => {
        expect(isPathValid('/sales')).toBe(false);
        expect(isPathValid('sales/')).toBe(false);
        expect(isPathValid('sales//berlin')).toBe(false);
        expect(isPathValid('')).toBe(false);
    });

    it('should refuse a segment outside the name charset', () => {
        expect(isPathValid('Sales/berlin')).toBe(false);
        expect(isPathValid('sales/ber lin')).toBe(false);
        expect(() => isPathValid('sales/ber lin', { throwOnFailure: true })).toThrow();
    });

    it('should split and join around the separator', () => {
        expect(splitPath('sales/berlin')).toEqual(['sales', 'berlin']);
        expect(joinPath('', 'sales')).toBe('sales');
        expect(joinPath('sales', 'berlin')).toBe('sales/berlin');
    });
});
